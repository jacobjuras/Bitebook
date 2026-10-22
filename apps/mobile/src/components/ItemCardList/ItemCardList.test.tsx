import { render, screen } from '@testing-library/react-native';
import { Text, StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    border: 'border',
    control: 'control',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import { ItemCardList } from './ItemCardList.js';

const items = [
  {
    details: [{ id: 'summary', text: 'First detail' }],
    id: 'first',
    title: 'First item',
  },
  {
    accessory: (testIDPrefix: string) => (
      <Text testID={`${testIDPrefix}-accessory`}>Accessory</Text>
    ),
    chips: [{ id: 'quick', label: 'Quick' }],
    details: [{ id: 'summary', text: 'Second detail' }],
    id: 'second',
    title: 'Second item',
  },
];

describe('ItemCardList', () => {
  it('renders structured cards in order with derived test-ID prefixes', async () => {
    await render(<ItemCardList items={items} testIDPrefix="items" />);

    expect(screen.getAllByTestId(/^items-\w+-card$/).map(({ props }) => (
      props.testID
    ))).toEqual(['items-first-card', 'items-second-card']);
    expect(screen.getByTestId('items-first-card-title')).toHaveTextContent(
      'First item',
    );
    expect(screen.getByTestId('items-first-summary')).toHaveTextContent(
      'First detail',
    );
    expect(screen.getByTestId('items-second-accessory')).toHaveTextContent(
      'Accessory',
    );
    expect(screen.getByTestId('items-second-chip-quick')).toHaveTextContent(
      'Quick',
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
      <ItemCardList items={[]} testIDPrefix="items" topPadding={16} />,
    );

    expect(StyleSheet.flatten(screen.getByTestId('items-list').props.contentContainerStyle))
      .toMatchObject({ paddingTop: 16 });
  });
});
