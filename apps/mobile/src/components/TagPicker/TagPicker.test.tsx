import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Keyboard, StyleSheet, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Ionicons' }));
vi.mock('~/theme', () => ({
  useThemeColors: () => ({
    accent: 'accent', accentSubtle: 'accent-subtle', background: 'background',
    border: 'border', danger: 'danger', textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import type { TagPickerValue } from '~/models';
import { tagFixtures } from '~/tests/fixtures/tags';
import { TagPicker } from './TagPicker.js';

function ControlledTagPicker({
  availableTags = [], initialValue = { newTags: [], tagIds: [] },
}: {
  availableTags?: Parameters<typeof TagPicker>[0]['availableTags'];
  initialValue?: TagPickerValue;
}) {
  const [value, setValue] = useState(initialValue);
  return <>
    <TagPicker
      availableTags={availableTags}
      itemName="Item"
      onChange={setValue}
      testIDPrefix="picker"
      value={value}
    />
    <Text testID="picker-value">{JSON.stringify(value)}</Text>
  </>;
}

function value(): TagPickerValue {
  return JSON.parse(screen.getByTestId('picker-value').props.children);
}

async function openInput() {
  await fireEvent.press(screen.getByTestId('picker-show-tag-input-button'));
  return screen.getByTestId('picker-tag-input');
}

describe('TagPicker', () => {
  it('opens Tag input and resets it on blur', async () => {
    await render(<ControlledTagPicker />);
    const input = await openInput();
    await fireEvent.changeText(input, 'draft');
    await fireEvent(input, 'blur');
    expect(screen.queryByTestId('picker-tag-input')).toBeNull();
    expect(screen.getByTestId('picker-show-tag-input-button')).toBeTruthy();
  });

  it('stages, deduplicates, and removes a new Tag', async () => {
    await render(<ControlledTagPicker />);
    let input = await openInput();
    await fireEvent.changeText(input, ' High Protein ');
    await fireEvent(input, 'submitEditing');
    expect(value()).toEqual({ newTags: [{ name: 'High Protein' }], tagIds: [] });
    expect(StyleSheet.flatten(screen.getByTestId('picker-new-tag-high protein').props.style))
      .toMatchObject({ borderStyle: 'dashed' });

    input = await openInput();
    await fireEvent.changeText(input, 'high protein');
    await fireEvent(input, 'submitEditing');
    expect(screen.getByTestId('picker-tag-error')).toHaveTextContent('Tag already added');
    await fireEvent.press(screen.getByTestId('picker-new-tag-high protein'));
    expect(value()).toEqual({ newTags: [], tagIds: [] });
  });

  it('filters suggestions and attaches an exact existing name', async () => {
    const { fiber, protein } = tagFixtures;
    await render(<ControlledTagPicker availableTags={[fiber, protein]} />);
    const input = await openInput();
    await fireEvent.changeText(input, 'pro');
    expect(screen.getByTestId(`picker-available-tag-${protein.id}`)).toBeTruthy();
    expect(screen.queryByTestId(`picker-available-tag-${fiber.id}`)).toBeNull();
    await fireEvent.changeText(input, 'Protein');
    await fireEvent(input, 'submitEditing');
    expect(value()).toEqual({ newTags: [], tagIds: [protein.id] });
  });

  it('clears existing and staged new Tags together', async () => {
    const { protein } = tagFixtures;
    await render(<ControlledTagPicker
      availableTags={[protein]}
      initialValue={{ newTags: [{ name: 'quick' }], tagIds: [protein.id] }}
    />);
    await fireEvent.press(screen.getByTestId('picker-clear-tags-button'));
    expect(value()).toEqual({ newTags: [], tagIds: [] });
    expect(screen.queryByTestId('picker-clear-tags-button')).toBeNull();
  });

  it('keeps a reserved-name error visible after keyboard dismissal', async () => {
    const dismissKeyboard = vi.spyOn(Keyboard, 'dismiss');
    await render(<ControlledTagPicker />);
    const input = await openInput();
    await fireEvent.changeText(input, 'favorite');
    await fireEvent(input, 'submitEditing');
    await fireEvent(input, 'blur');
    expect(dismissKeyboard).toHaveBeenCalledOnce();
    expect(screen.getByTestId('picker-tag-error'))
      .toHaveTextContent('Favorite is reserved for the favorite toggle');
    expect(screen.getByTestId('picker-tag-input-container')).toBeTruthy();
    dismissKeyboard.mockRestore();
  });

  it('does not open after ten Tags are selected', async () => {
    await render(<ControlledTagPicker initialValue={{
      newTags: Array.from({ length: 10 }, (_, index) => ({ name: `tag-${index}` })),
      tagIds: [],
    }} />);
    await fireEvent.press(screen.getByTestId('picker-show-tag-input-button'));
    expect(screen.queryByTestId('picker-tag-input')).toBeNull();
    expect(screen.getByTestId('picker-tag-error'))
      .toHaveTextContent('Items can have up to 10 tags');
  });
});
