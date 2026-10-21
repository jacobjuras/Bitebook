import { describe, expect, it } from 'vitest';

import { calculateAvailableServings } from '../mealAvailability.js';
import type { Food } from '../food.js';
import type { Meal } from '../meal.js';

function createFood(
  id: string,
  amount: number,
  unit: Food['currentStock']['unit'],
): Food {
  return {
    id,
    userId: 'user-123',
    name: 'Food',
    servingSize: { amount: 1, unit },
    nutritionFacts: { caloriesKcal: 100, micronutrients: {} },
    currentStock: { amount, unit },
    createdAt: '2026-10-19T01:00:00Z',
    updatedAt: '2026-10-19T01:00:00Z',
  };
}

const eggId = '123e4567-e89b-42d3-a456-426614174000';
const milkId = '123e4567-e89b-42d3-a456-426614174001';
const meal: Meal = {
  id: '123e4567-e89b-42d3-a456-426614174002',
  userId: 'user-123',
  name: 'Breakfast',
  ingredients: [
    { foodId: eggId, quantity: { amount: 2, unit: 'item' } },
    { foodId: milkId, quantity: { amount: 250, unit: 'ml' } },
  ],
  createdAt: '2026-10-19T01:00:00Z',
  updatedAt: '2026-10-19T01:00:00Z',
};

describe('calculateAvailableServings', () => {
  it('uses the ingredient with the fewest complete servings', () => {
    const foods = [
      createFood(eggId, 5, 'item'),
      createFood(milkId, 1, 'l'),
    ];

    expect(calculateAvailableServings(meal, foods)).toBe(2);
  });

  it('returns zero when an ingredient is out of stock', () => {
    const foods = [
      createFood(eggId, 0, 'item'),
      createFood(milkId, 1, 'l'),
    ];

    expect(calculateAvailableServings(meal, foods)).toBe(0);
  });

  it('rejects a missing Food', () => {
    expect(() =>
      calculateAvailableServings(meal, [createFood(eggId, 5, 'item')]),
    ).toThrow(RangeError);
  });

  it('rejects incompatible stock and ingredient units', () => {
    const foods = [
      createFood(eggId, 5, 'item'),
      createFood(milkId, 1, 'g'),
    ];

    expect(() => calculateAvailableServings(meal, foods)).toThrow(RangeError);
  });
});
