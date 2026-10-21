import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Ionicons' }));
vi.mock('@expo/ui/community/menu', async () => {
  const { createElement } = await vi.importActual<typeof import('react')>('react');
  return {
    MenuView: ({ actions, children, ...props }: {
      actions: unknown[];
      children: ReactNode;
      testID?: string;
    }) => createElement('MenuView', { ...props, actions }, children),
  };
});
vi.mock('../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    accent: 'accent',
    border: 'border',
    control: 'control',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import { SearchFilterSortControls } from '../SearchFilterSortControls.js';

const filters = [
  { id: 'favorites', label: 'Favorites', selected: false },
  { id: 'tag:fruit', label: 'fruit', selected: true },
] as const;
const sortOptions = [
  {
    directions: [
      { id: 'descending', label: 'Newest first' },
      { id: 'ascending', label: 'Oldest first' },
    ],
    id: 'recent',
    label: 'Recent',
  },
  {
    directions: [
      { id: 'ascending', label: 'A–Z' },
      { id: 'descending', label: 'Z–A' },
    ],
    id: 'name',
    label: 'Name',
  },
] as const;

async function renderControls(overrides: Partial<React.ComponentProps<
  typeof SearchFilterSortControls
>> = {}) {
  const props = {
    activeSortDirectionId: 'descending',
    activeSortId: 'recent',
    filters,
    itemName: 'Food',
    itemNamePlural: 'Foods',
    onClearFilters: vi.fn(),
    onSearchChange: vi.fn(),
    onSelectSort: vi.fn(),
    onToggleFilter: vi.fn(),
    searchValue: '',
    sortOptions,
    testIDPrefix: 'pantry-food',
    ...overrides,
  };

  await render(<SearchFilterSortControls {...props} />);
  return props;
}

describe('SearchFilterSortControls', () => {
  it('renders search and sort state without active filters', async () => {
    await renderControls({
      filters: filters.map((filter) => ({ ...filter, selected: false })),
    });

    expect(screen.getByTestId('pantry-food-search-input').props.placeholder)
      .toBe('Search foods');
    expect(screen.queryByTestId('pantry-food-search-clear-button')).toBeNull();
    expect(screen.queryByTestId('pantry-food-active-filters')).toBeNull();
    expect(
      screen.getByTestId('pantry-food-filter-sort-button').props.accessibilityLabel,
    ).toBe('Filter and sort Foods, currently Recent, Newest first');
    expect(screen.getByTestId('pantry-food-filter-sort-icon').props.name)
      .toBe('options-outline');
    expect(StyleSheet.flatten(
      screen.getByTestId('pantry-food-filter-sort-button').props.style,
    )).toMatchObject({ height: 46, width: 46 });
  });

  it('updates and clears search text', async () => {
    const props = await renderControls({ searchValue: 'apple' });

    await fireEvent.changeText(
      screen.getByTestId('pantry-food-search-input'),
      'pear',
    );
    expect(props.onSearchChange).toHaveBeenCalledWith('pear');

    await fireEvent.press(screen.getByTestId('pantry-food-search-clear-button'));
    expect(screen.getByTestId('pantry-food-search-clear-icon').props.name)
      .toBe('close-circle');
    expect(props.onSearchChange).toHaveBeenCalledWith('');
  });

  it('builds filter actions and handles menu and chip selections', async () => {
    const props = await renderControls();
    const menu = screen.getByTestId('pantry-food-filter-sort-menu');

    expect(menu.props.actions[0]).toEqual({
      displayInline: true,
      id: 'filter-section',
      subactions: [
        { id: 'favorites', state: 'off', title: 'Favorites' },
        { id: 'tag:fruit', state: 'on', title: 'fruit' },
      ],
      title: 'Filter',
    });
    expect(screen.getByTestId('pantry-food-filter-sort-icon').props.name)
      .toBe('options');
    expect(screen.getByTestId('pantry-food-active-filter-tag-fruit'))
      .toHaveTextContent('fruit');

    await fireEvent(menu, 'pressAction', { nativeEvent: { event: 'favorites' } });
    expect(props.onToggleFilter).toHaveBeenCalledWith('favorites');

    await fireEvent.press(screen.getByTestId('pantry-food-active-filter-tag-fruit'));
    expect(props.onToggleFilter).toHaveBeenCalledWith('tag:fruit');

    await fireEvent.press(screen.getByTestId('pantry-food-clear-filters-button'));
    expect(props.onClearFilters).toHaveBeenCalledOnce();
  });

  it('builds contextual sort actions and reports valid selections', async () => {
    const props = await renderControls();
    const menu = screen.getByTestId('pantry-food-filter-sort-menu');

    expect(menu.props.actions[1]).toEqual({
      displayInline: true,
      id: 'sort-section',
      subactions: [
        {
          id: 'sort:recent',
          subactions: [
            { id: 'sort:recent:descending', state: 'on', title: 'Newest first' },
            { id: 'sort:recent:ascending', state: 'off', title: 'Oldest first' },
          ],
          title: 'Recent',
        },
        {
          id: 'sort:name',
          subactions: [
            { id: 'sort:name:ascending', state: 'off', title: 'A–Z' },
            { id: 'sort:name:descending', state: 'off', title: 'Z–A' },
          ],
          title: 'Name',
        },
      ],
      title: 'Sort',
    });

    await fireEvent(menu, 'pressAction', {
      nativeEvent: { event: 'sort:name:ascending' },
    });
    expect(props.onSelectSort).toHaveBeenCalledWith('name', 'ascending');

    await fireEvent(menu, 'pressAction', {
      nativeEvent: { event: 'sort:unsupported:ascending' },
    });
    expect(props.onSelectSort).toHaveBeenCalledOnce();
  });

  it('omits the Filter section for a sort-only list', async () => {
    await renderControls({
      filters: [],
      itemName: 'Meal',
      itemNamePlural: 'Meals',
      testIDPrefix: 'pantry-meal',
    });

    const menu = screen.getByTestId('pantry-meal-filter-sort-menu');
    expect(menu.props.actions).toHaveLength(1);
    expect(menu.props.actions[0].id).toBe('sort-section');
    expect(
      screen.getByTestId('pantry-meal-filter-sort-button').props.accessibilityLabel,
    ).toBe('Sort Meals, currently Recent, Newest first');
  });
});
