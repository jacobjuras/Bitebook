import type { Food } from '@bitebook/domain';
import { describe, expect, it } from 'vitest';

import {
  FoodSortField,
  foodSortDefinitions,
  foodSortFields,
  isFoodSortField,
} from '../foodSorting.js';

const baseFood: Food = {
  createdAt: '2026-10-20T12:00:00.000Z',
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Apple',
  nutritionFacts: { caloriesKcal: 100, micronutrients: {} },
  servingSize: { amount: 1, unit: 'item' },
  updatedAt: '2026-10-20T12:00:00.000Z',
  userId: 'user-123',
};

function compare(
  field: FoodSortField,
  first: Food,
  second: Food,
) {
  return foodSortDefinitions[field].compare(first, second);
}

describe('Food sort definitions', () => {
  it('sorts recent Foods by last logged time with created time as fallback', () => {
    const loggedEarlier: Food = {
      ...baseFood,
      createdAt: '2026-10-21T12:00:00.000Z',
      lastLoggedAt: '2026-10-19T12:00:00.000Z',
    };
    const createdLater: Food = {
      ...baseFood,
      createdAt: '2026-10-20T12:00:00.000Z',
    };

    expect(compare(FoodSortField.Recent, loggedEarlier, createdLater))
      .toBeLessThan(0);
  });

  it('sorts Foods alphabetically by name', () => {
    const banana = { ...baseFood, name: 'Banana' };

    expect(compare(FoodSortField.Name, baseFood, banana)).toBeLessThan(0);
  });

  it('sorts Foods numerically by calories', () => {
    const higherCalories: Food = {
      ...baseFood,
      nutritionFacts: { caloriesKcal: 200, micronutrients: {} },
    };

    expect(compare(FoodSortField.Calories, baseFood, higherCalories))
      .toBeLessThan(0);
  });

  it('provides a label for every sortable field', () => {
    expect(foodSortFields.map((field) => foodSortDefinitions[field].label))
      .toEqual(['Recent', 'Name', 'Calories']);
  });
});

describe('isFoodSortField', () => {
  it('accepts every sortable field and rejects unsupported menu events', () => {
    for (const field of foodSortFields) {
      expect(isFoodSortField(field)).toBe(true);
    }

    expect(isFoodSortField('protein')).toBe(false);
  });
});
