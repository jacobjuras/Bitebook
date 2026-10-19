import { describe, expect, it } from 'vitest';

import { mealSchema } from '../src/index.js';

const foodId = '123e4567-e89b-42d3-a456-426614174000';
const validMeal = {
  id: '123e4567-e89b-42d3-a456-426614174001',
  userId: 'user-123',
  name: 'Breakfast',
  ingredients: [
    {
      foodId,
      quantity: { amount: 3, unit: 'item' },
    },
  ],
  createdAt: '2026-10-19T01:00:00Z',
  updatedAt: '2026-10-19T01:00:00Z',
};

describe('mealSchema', () => {
  it('accepts a Meal containing a default ingredient quantity', () => {
    expect(mealSchema.parse(validMeal)).toEqual(validMeal);
  });

  it('requires at least one ingredient', () => {
    expect(
      mealSchema.safeParse({ ...validMeal, ingredients: [] }).success,
    ).toBe(false);
  });

  it('requires positive ingredient quantities', () => {
    const ingredients = [
      {
        foodId,
        quantity: { amount: 0, unit: 'item' },
      },
    ];

    expect(mealSchema.safeParse({ ...validMeal, ingredients }).success).toBe(
      false,
    );
  });

  it('allows each Food to appear only once', () => {
    const ingredients = [
      validMeal.ingredients[0],
      {
        foodId,
        quantity: { amount: 1, unit: 'item' },
      },
    ];

    expect(mealSchema.safeParse({ ...validMeal, ingredients }).success).toBe(
      false,
    );
  });
});
