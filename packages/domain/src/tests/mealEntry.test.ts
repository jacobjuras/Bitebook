import { describe, expect, it } from 'vitest';

import { mealEntrySchema } from '../mealEntry.js';

const validMealEntry = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  userId: 'user-123',
  source: {
    type: 'meal',
    id: '123e4567-e89b-42d3-a456-426614174001',
    name: 'Breakfast',
  },
  ingredients: [
    {
      foodId: '123e4567-e89b-42d3-a456-426614174002',
      quantity: { amount: 4, unit: 'item' },
      foodSnapshot: {
        name: 'Egg',
        servingSize: { amount: 1, unit: 'item' },
        nutritionFacts: {
          caloriesKcal: 70,
          proteinG: 6,
          micronutrients: {},
        },
      },
    },
  ],
  scheduledAt: '2026-10-19T12:30:00Z',
  preparation: 'homePrepared',
  createdAt: '2026-10-19T01:00:00Z',
  updatedAt: '2026-10-19T01:00:00Z',
};

describe('mealEntrySchema', () => {
  it('accepts exact logged quantities and Food snapshots', () => {
    expect(mealEntrySchema.parse(validMealEntry)).toEqual(validMealEntry);
  });

  it.each([
    { ...validMealEntry, ingredients: [] },
    {
      ...validMealEntry,
      source: { ...validMealEntry.source, type: 'recipe' },
    },
    {
      ...validMealEntry,
      ingredients: [
        {
          foodId: validMealEntry.ingredients[0].foodId,
          quantity: validMealEntry.ingredients[0].quantity,
        },
      ],
    },
  ])('rejects an invalid MealEntry: %o', (mealEntry) => {
    expect(mealEntrySchema.safeParse(mealEntry).success).toBe(false);
  });
});
