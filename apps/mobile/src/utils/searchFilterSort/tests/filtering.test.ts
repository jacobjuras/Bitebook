import { describe, expect, it } from 'vitest';

import { filterItems } from '../filtering.js';

const fruitTagId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const snackTagId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const breakfastTagId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const items = [
  {
    id: 'apple',
    isFavorite: true,
    name: 'Green Apple',
    tagIds: [fruitTagId, snackTagId],
  },
  {
    id: 'banana',
    name: 'Banana',
    tagIds: [fruitTagId],
  },
  {
    id: 'yogurt',
    isFavorite: true,
    name: 'Greek Yogurt',
    tagIds: [breakfastTagId, snackTagId],
  },
  {
    id: 'chicken',
    name: 'Chicken',
  },
];

describe('filterItems', () => {
  it('combines normalized search, Favorites, and every selected Tag ID', () => {
    expect(filterItems(items, {
      favorites: true,
      search: '  APP  ',
      tagIds: [fruitTagId, snackTagId],
    })).toEqual([items[0]]);
  });

  it('does not restrict items when filters are inactive', () => {
    expect(filterItems(items, {
      favorites: false,
      search: '',
      tagIds: [],
    })).toEqual(items);
  });
});
