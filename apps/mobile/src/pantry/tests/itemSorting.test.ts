import { describe, expect, it } from 'vitest';

import {
  ItemSortField,
  type SortableItem,
  itemSortDefinitions,
  itemSortFields,
} from '../itemSorting.js';

const baseItem: SortableItem = {
  caloriesKcal: 100,
  name: 'Apple',
  recentAt: '2026-10-20T12:00:00.000Z',
};

function compare(
  field: ItemSortField,
  first: SortableItem,
  second: SortableItem,
) {
  return itemSortDefinitions[field].compare(first, second);
}

describe('Item sort definitions', () => {
  it('sorts items by recency', () => {
    const earlier = {
      ...baseItem,
      recentAt: '2026-10-19T12:00:00.000Z',
    };

    expect(compare(ItemSortField.Recent, earlier, baseItem)).toBeLessThan(0);
  });

  it('sorts items alphabetically by name', () => {
    const banana = { ...baseItem, name: 'Banana' };

    expect(compare(ItemSortField.Name, baseItem, banana)).toBeLessThan(0);
  });

  it('sorts items numerically by calories', () => {
    const higherCalories = { ...baseItem, caloriesKcal: 200 };

    expect(compare(ItemSortField.Calories, baseItem, higherCalories))
      .toBeLessThan(0);
  });

  it('provides a label for every sortable field', () => {
    expect(itemSortFields.map((field) => itemSortDefinitions[field].label))
      .toEqual(['Recent', 'Name', 'Calories']);
  });

  it('provides contextual direction choices in their natural order', () => {
    expect(itemSortDefinitions[ItemSortField.Recent].directionOrder.map(
      (direction) =>
        itemSortDefinitions[ItemSortField.Recent].directionLabels[direction],
    )).toEqual(['Newest first', 'Oldest first']);
    expect(itemSortDefinitions[ItemSortField.Name].directionOrder.map(
      (direction) =>
        itemSortDefinitions[ItemSortField.Name].directionLabels[direction],
    )).toEqual(['A–Z', 'Z–A']);
    expect(itemSortDefinitions[ItemSortField.Calories].directionOrder.map(
      (direction) =>
        itemSortDefinitions[ItemSortField.Calories].directionLabels[direction],
    )).toEqual(['Low to high', 'High to low']);
  });
});
