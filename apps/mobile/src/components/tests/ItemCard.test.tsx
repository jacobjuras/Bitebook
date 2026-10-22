import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    border: 'border',
    control: 'control',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import { ItemCard } from '../ItemCard.js';

describe('ItemCard', () => {
  it('renders structured details and chips in the shared card layout', async () => {
    await render(
      <ItemCard
        chips={[
          { id: 'quick', label: 'Quick' },
          { id: 'favorite', label: 'Favorite' },
        ]}
        details={[
          { id: 'first-detail', text: 'First detail' },
          { id: 'second-detail', text: 'Second detail' },
        ]}
        testIDPrefix="item-123"
        title="Item name"
      />,
    );

    expect(screen.getByTestId('item-123-card-title')).toHaveTextContent('Item name');
    expect(screen.getByTestId('item-123-first-detail')).toHaveTextContent(
      'First detail',
    );
    expect(screen.getByTestId('item-123-second-detail')).toHaveTextContent(
      'Second detail',
    );
    expect(screen.getByTestId('item-123-chip-quick')).toHaveTextContent('Quick');
    expect(screen.getByTestId('item-123-chip-favorite')).toHaveTextContent(
      'Favorite',
    );
    expect(StyleSheet.flatten(screen.getByTestId('item-123-card').props.style))
      .toMatchObject({
        borderColor: 'border',
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
        padding: 14,
      });
    expect(StyleSheet.flatten(screen.getByTestId('item-123-card-title').props.style))
      .toMatchObject({
        color: 'text-primary',
        flex: 1,
        fontSize: 17,
        fontWeight: '600',
      });
    expect(StyleSheet.flatten(screen.getByTestId('item-123-first-detail').props.style))
      .toMatchObject({ color: 'text-secondary', fontSize: 14 });
    expect(StyleSheet.flatten(screen.getByTestId('item-123-chip-quick').props.style))
      .toMatchObject({
        backgroundColor: 'control',
        borderRadius: 8,
        color: 'text-secondary',
        fontSize: 12,
      });
  });

  it('composes an optional accessory without rendering chips', async () => {
    const onPress = vi.fn();
    await render(
      <ItemCard
        accessory={(
          <Pressable onPress={onPress} testID="item-action">
            <Text>Act</Text>
          </Pressable>
        )}
        details={[]}
        testIDPrefix="item-123"
        title="Item name"
      />,
    );

    expect(screen.queryByTestId('item-123-chips')).toBeNull();
    await fireEvent.press(screen.getByTestId('item-action'));
    expect(onPress).toHaveBeenCalledOnce();
  });
});
