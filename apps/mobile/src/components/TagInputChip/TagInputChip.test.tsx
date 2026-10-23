import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Ionicons' }));
vi.mock('~/theme', () => ({
  useThemeColors: () => ({
    background: 'background',
    border: 'border',
    danger: 'danger',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import { TagInputChip } from './TagInputChip.js';

function ControlledTagInputChip({ isInvalid = false }) {
  const [event, setEvent] = useState('');
  const [value, setValue] = useState('');
  return <>
    <TagInputChip
      model={{
        isInvalid,
        onBlur: () => setEvent('blurred'),
        onCancel: () => setEvent('cancelled'),
        onChange: setValue,
        onSubmit: () => setEvent('submitted'),
        value,
      }}
      testIDPrefix="tag-input"
    />
    <Text testID="tag-input-event">{event}</Text>
  </>;
}

describe('TagInputChip', () => {
  it('updates its controlled value and submits through the keyboard', async () => {
    await render(<ControlledTagInputChip />);
    const input = screen.getByTestId('tag-input-tag-input');

    expect(input.props).toMatchObject({ autoFocus: true, returnKeyType: 'done' });
    await fireEvent.changeText(input, 'breakfast');
    expect(screen.getByTestId('tag-input-tag-input').props.value).toBe('breakfast');
    await fireEvent(input, 'submitEditing');
    expect(screen.getByTestId('tag-input-event')).toHaveTextContent('submitted');
  });

  it('expands to measured text width within its bounds', async () => {
    await render(<ControlledTagInputChip />);
    const input = screen.getByTestId('tag-input-tag-input');
    const measurement = screen.getByTestId(
      'tag-input-tag-input-measurement',
      { includeHiddenElements: true },
    );

    expect(StyleSheet.flatten(input.props.style)).toMatchObject({ width: 76 });
    await fireEvent(measurement, 'layout', {
      nativeEvent: { layout: { width: 120 } },
    });
    expect(StyleSheet.flatten(input.props.style)).toMatchObject({ width: 124 });
    await fireEvent(measurement, 'layout', {
      nativeEvent: { layout: { width: 300 } },
    });
    expect(StyleSheet.flatten(input.props.style)).toMatchObject({ width: 240 });
  });

  it('renders invalid state and forwards blur and cancel actions', async () => {
    await render(<ControlledTagInputChip isInvalid />);
    expect(StyleSheet.flatten(
      screen.getByTestId('tag-input-tag-input-container').props.style,
    )).toMatchObject({ borderColor: 'danger' });

    await fireEvent(screen.getByTestId('tag-input-tag-input'), 'blur');
    expect(screen.getByTestId('tag-input-event')).toHaveTextContent('blurred');
    await fireEvent.press(screen.getByTestId('tag-input-cancel-tag-button'));
    expect(screen.getByTestId('tag-input-event')).toHaveTextContent('cancelled');
  });
});
