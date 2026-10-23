import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Ionicons' }));
vi.mock('~/theme', () => ({
  useThemeColors: () => ({
    accent: 'accent',
    accentSubtle: 'accent-subtle',
    border: 'border',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import { TagChipVariant } from '~/constants';
import { TagChip } from './TagChip.js';

async function renderChip(variant: TagChipVariant) {
  const onPress = vi.fn();
  await render(
    <TagChip
      accessibilityLabel="Select example"
      id="example"
      label="Example"
      onPress={onPress}
      testIDPrefix="tag-chip"
      variant={variant}
    />,
  );
  return onPress;
}

describe('TagChip', () => {
  it('renders an outlined available chip without icons', async () => {
    const onPress = await renderChip(TagChipVariant.Available);
    const chip = screen.getByTestId('tag-chip-example');

    expect(chip).toHaveTextContent('Example');
    expect(chip.props.accessibilityLabel).toBe('Select example');
    expect(StyleSheet.flatten(chip.props.style)).toMatchObject({
      borderColor: 'border',
      borderWidth: 1,
    });
    expect(screen.queryByTestId('tag-chip-example-leading-icon')).toBeNull();
    expect(screen.queryByTestId('tag-chip-example-trailing-icon')).toBeNull();
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('renders a filled selected chip with a remove icon', async () => {
    await renderChip(TagChipVariant.Selected);
    expect(StyleSheet.flatten(screen.getByTestId('tag-chip-example').props.style))
      .toMatchObject({ backgroundColor: 'accent-subtle' });
    expect(screen.getByTestId('tag-chip-example-trailing-icon').props.name)
      .toBe('close');
    expect(screen.queryByTestId('tag-chip-example-leading-icon')).toBeNull();
  });

  it('renders a dashed pending chip with add and remove icons', async () => {
    await renderChip(TagChipVariant.Pending);
    expect(StyleSheet.flatten(screen.getByTestId('tag-chip-example').props.style))
      .toMatchObject({ borderColor: 'accent', borderStyle: 'dashed' });
    expect(screen.getByTestId('tag-chip-example-leading-icon').props.name).toBe('add');
    expect(screen.getByTestId('tag-chip-example-trailing-icon').props.name).toBe('close');
  });
});
