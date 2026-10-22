import { describe, expect, it } from 'vitest';

import { filterItems, getAvailableTags } from '../itemFiltering.js';

const items = [
  {
    id: 'apple',
    isFavorite: true,
    name: 'Green Apple',
    tags: ['fruit', 'snack'],
  },
  {
    id: 'banana',
    name: 'Banana',
    tags: ['fruit'],
  },
  {
    id: 'yogurt',
    isFavorite: true,
    name: 'Greek Yogurt',
    tags: ['breakfast', 'snack'],
  },
  {
    id: 'chicken',
    name: 'Chicken',
  },
];

describe('filterItems', () => {
  it('combines normalized search, Favorites, and every selected tag', () => {
    expect(filterItems(items, {
      favorites: true,
      search: '  APP  ',
      tags: ['fruit', 'snack'],
    })).toEqual([items[0]]);
  });

  it('does not restrict items when filters are inactive', () => {
    expect(filterItems(items, {
      favorites: false,
      search: '',
      tags: [],
    })).toEqual(items);
  });
});

describe('getAvailableTags', () => {
  it('returns unique tags in display order', () => {
    expect(getAvailableTags(items)).toEqual([
      'breakfast',
      'fruit',
      'snack',
    ]);
  });
});
