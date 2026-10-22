import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { describe, expect, it, vi } from 'vitest';


vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Ionicons' }));
vi.mock('../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    accent: 'accent',
    border: 'border',
    control: 'control',
    onAccent: 'on-accent',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import { ContentStateKind } from '../../constants/content-state-constants.js';
import { ItemListView } from './ItemListView.js';

const items = [
  {
    details: [{ id: 'summary', text: 'Item summary' }],
    id: '123',
    title: 'Item name',
  },
];

describe('ItemListView', () => {
  it('composes controls, cards, and the add action', async () => {
    const onAdd = vi.fn();
    await render(
      <ItemListView
        action={{
          label: 'Add item',
          onPress: onAdd,
          testIDPrefix: 'items',
        }}
        contentState={null}
        controls={<Text testID="item-controls">Controls</Text>}
        items={items}
        itemTestIDPrefix="items"
        testIDPrefix="view"
        topPadding={16}
      />,
    );

    expect(screen.getByTestId('item-controls')).toHaveTextContent('Controls');
    expect(screen.getByTestId('items-list')).toBeTruthy();
    expect(screen.getByTestId('items-123-card-title')).toHaveTextContent(
      'Item name',
    );
    expect(screen.queryByTestId('view-loading-indicator')).toBeNull();

    await fireEvent.press(screen.getByTestId('items-add-button'));

    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('renders a content state instead of cards and optional UI', async () => {
    await render(
      <ItemListView
        contentState={{ kind: ContentStateKind.Loading }}
        items={items}
        itemTestIDPrefix="items"
        testIDPrefix="view"
      />,
    );

    expect(screen.getByTestId('view-loading-indicator')).toBeTruthy();
    expect(screen.queryByTestId('items-list')).toBeNull();
    expect(screen.queryByTestId('items-add-button')).toBeNull();
    expect(screen.queryByTestId('item-controls')).toBeNull();
  });
});
