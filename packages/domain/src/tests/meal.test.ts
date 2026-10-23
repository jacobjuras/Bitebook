import { describe, expect, it } from 'vitest';

import { mealSchema } from '../meal.js';

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

  it('normalizes optional Meal organization metadata', () => {
    expect(mealSchema.parse({
      ...validMeal,
      isFavorite: true,
      tags: [' Breakfast ', 'HIGH-PROTEIN', 'breakfast'],
    })).toEqual({
      ...validMeal,
      isFavorite: true,
      tags: ['breakfast', 'high-protein'],
    });
  });

  it.each([
    { ...validMeal, tags: ['favorite'] },
    {
      ...validMeal,
      tags: Array.from({ length: 11 }, (_, index) => `tag-${index}`),
    },
    { ...validMeal, tags: [''] },
    { ...validMeal, isFavorite: 'yes' },
  ])('rejects invalid Meal organization metadata: %o', (meal) => {
    expect(mealSchema.safeParse(meal).success).toBe(false);
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
  it('limits ingredients to one atomic DynamoDB transaction', () => {
    const ingredients = Array.from({ length: 100 }, (_, index) => ({
      foodId: `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
      quantity: { amount: 1, unit: 'item' },
    }));

    expect(mealSchema.safeParse({ ...validMeal, ingredients }).success).toBe(
      false,
    );
  });
});
