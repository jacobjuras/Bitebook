import { describe, expect, it } from 'vitest';

import {
  ItemSortField,
  SortDirection,
  itemSortDefinitions,
  itemSortFields,
  itemSortOptions,
} from '~/constants';
import type { SortableItem } from '~/models';
import { sortItems } from '../sorting.js';

const items: SortableItem[] = [
  {
    caloriesKcal: 200,
    name: 'Banana',
    recentAt: '2026-10-19T12:00:00.000Z',
  },
  {
    caloriesKcal: 100,
    name: 'Apple',
    recentAt: '2026-10-20T12:00:00.000Z',
  },
];

const getSortableItem = (item: SortableItem) => item;

describe('sortItems', () => {
  it.each([
    [ItemSortField.Recent, SortDirection.Descending, ['Apple', 'Banana']],
    [ItemSortField.Name, SortDirection.Ascending, ['Apple', 'Banana']],
    [ItemSortField.Calories, SortDirection.Descending, ['Banana', 'Apple']],
  ] as const)(
    'sorts %s items in %s order',
    (field, direction, expectedNames) => {
      expect(sortItems(items, getSortableItem, field, direction).map(
        ({ name }) => name,
      )).toEqual(expectedNames);
      expect(items.map(({ name }) => name)).toEqual(['Banana', 'Apple']);
    },
  );

  it('uses item name to break equal field values', () => {
    const equalCalories = items.map((item) => ({ ...item, caloriesKcal: 100 }));

    expect(sortItems(
      equalCalories,
      getSortableItem,
      ItemSortField.Calories,
      SortDirection.Ascending,
    ).map(({ name }) => name)).toEqual(['Apple', 'Banana']);
  });
});

describe('item sort constants', () => {
  it('defines labels and directions for every sortable field', () => {
    expect(itemSortFields.map((field) => itemSortDefinitions[field].label))
      .toEqual(['Recent', 'Name', 'Calories']);
    expect(itemSortOptions).toEqual([
      {
        directions: [
          { id: SortDirection.Descending, label: 'Newest first' },
          { id: SortDirection.Ascending, label: 'Oldest first' },
        ],
        id: ItemSortField.Recent,
        label: 'Recent',
      },
      {
        directions: [
          { id: SortDirection.Ascending, label: 'A–Z' },
          { id: SortDirection.Descending, label: 'Z–A' },
        ],
        id: ItemSortField.Name,
        label: 'Name',
      },
      {
        directions: [
          { id: SortDirection.Ascending, label: 'Low to high' },
          { id: SortDirection.Descending, label: 'High to low' },
        ],
        id: ItemSortField.Calories,
        label: 'Calories',
      },
    ]);
  });
});
