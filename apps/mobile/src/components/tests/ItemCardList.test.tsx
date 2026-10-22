import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    border: 'border',
    textPrimary: 'text-primary',
  }),
}));

import { ItemCard } from '../ItemCard.js';
import { ItemCardList } from '../ItemCardList.js';

const items = [
  { id: 'first', name: 'First item' },
  { id: 'second', name: 'Second item' },
];

describe('ItemCardList', () => {
  it('renders items in order with derived test-ID prefixes', async () => {
    await render(
      <ItemCardList
        items={items}
        keyExtractor={({ id }) => id}
        renderItem={(item, testIDPrefix) => (
          <ItemCard testIDPrefix={testIDPrefix} title={item.name} />
        )}
        testIDPrefix="items"
      />,
    );

    expect(screen.getAllByTestId(/^items-\w+-card$/).map(({ props }) => (
      props.testID
    ))).toEqual(['items-first-card', 'items-second-card']);
    expect(screen.getByTestId('items-first-card-title')).toHaveTextContent(
      'First item',
    );
    expect(screen.getByTestId('items-second-card-title')).toHaveTextContent(
      'Second item',
    );
    expect(StyleSheet.flatten(screen.getByTestId('items-list').props.contentContainerStyle))
      .toMatchObject({
        gap: 10,
        paddingBottom: 24,
        paddingHorizontal: 24,
        paddingTop: 24,
      });
  });

  it('accepts context-specific top spacing', async () => {
    await render(
      <ItemCardList
        items={[]}
        keyExtractor={() => ''}
        renderItem={() => null}
        testIDPrefix="items"
        topPadding={16}
      />,
    );

    expect(StyleSheet.flatten(screen.getByTestId('items-list').props.contentContainerStyle))
      .toMatchObject({ paddingTop: 16 });
  });
});
