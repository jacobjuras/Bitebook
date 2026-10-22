import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('~/theme', () => ({
  useThemeColors: () => ({
    accent: 'accent',
    onAccent: 'on-accent',
  }),
}));

import { AddItemButton } from './AddItemButton.js';

describe('AddItemButton', () => {
  it('renders the labeled primary action and invokes it when pressed', async () => {
    const onPress = vi.fn();
    await render(
      <AddItemButton
        label="Add item"
        onPress={onPress}
        testIDPrefix="items"
      />,
    );

    const button = screen.getByTestId('items-add-button');
    expect(button.props.accessibilityRole).toBe('button');
    expect(screen.getByTestId('items-add-button-label')).toHaveTextContent(
      'Add item',
    );
    expect(StyleSheet.flatten(button.props.style))
      .toMatchObject({
        alignItems: 'center',
        backgroundColor: 'accent',
        borderRadius: 12,
        margin: 24,
        padding: 14,
      });

    await fireEvent(button, 'pressIn');
    expect(StyleSheet.flatten(
      screen.getByTestId('items-add-button').props.style,
    )).toMatchObject({ opacity: 0.75 });
    expect(StyleSheet.flatten(
      screen.getByTestId('items-add-button-label').props.style,
    )).toMatchObject({
      color: 'on-accent',
      fontSize: 17,
      fontWeight: '600',
    });

    await fireEvent.press(button);

    expect(onPress).toHaveBeenCalledOnce();
  });
});
