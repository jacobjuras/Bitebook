import { describe, expect, it } from 'vitest';

import { foodSchema } from '../food.js';

const validFood = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  userId: 'user-123',
  name: 'Egg',
  servingSize: { amount: 1, unit: 'item' },
  nutritionFacts: {
    caloriesKcal: 70,
    proteinG: 6,
    micronutrients: {},
  },
  currentStock: { amount: 12, unit: 'item' },
  createdAt: '2026-10-19T01:00:00Z',
  updatedAt: '2026-10-19T01:00:00Z',
};

describe('foodSchema', () => {
  it('accepts a complete Food record', () => {
    expect(foodSchema.parse(validFood)).toEqual(validFood);
  });

  it.each([
    { ...validFood, id: 'not-a-uuid' },
    { ...validFood, name: '   ' },
    { ...validFood, servingSize: { amount: 0, unit: 'item' } },
    { ...validFood, createdAt: '2026-10-18T18:00:00-07:00' },
  ])('rejects an invalid Food record: %o', (food) => {
    expect(foodSchema.safeParse(food).success).toBe(false);
  });

  it('rejects fields outside the persisted Food contract', () => {
    expect(
      foodSchema.safeParse({ ...validFood, barcode: '012345678905' }).success,
    ).toBe(false);
  });
});
