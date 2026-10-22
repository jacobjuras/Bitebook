import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    border: 'border',
    textPrimary: 'text-primary',
  }),
}));

import { ItemCard } from '../ItemCard.js';

describe('ItemCard', () => {
  it('renders its title and supporting content in the shared card shell', async () => {
    await render(
      <ItemCard testIDPrefix="item-123" title="Item name">
        <Text testID="item-detail">Item detail</Text>
      </ItemCard>,
    );

    expect(screen.getByTestId('item-123-card-title')).toHaveTextContent('Item name');
    expect(screen.getByTestId('item-detail')).toHaveTextContent('Item detail');
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
  });

  it('composes optional accessory content', async () => {
    const onPress = vi.fn();
    await render(
      <ItemCard
        accessory={(
          <Pressable onPress={onPress} testID="item-action">
            <Text>Act</Text>
          </Pressable>
        )}
        testIDPrefix="item-123"
        title="Item name"
      />,
    );

    await fireEvent.press(screen.getByTestId('item-action'));
    expect(onPress).toHaveBeenCalledOnce();
  });
});
