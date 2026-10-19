import { describe, expect, it } from 'vitest';

import {
  foodSchema,
  nutritionFactsSchema,
  quantitySchema,
} from '../src/index.js';

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

describe('quantitySchema', () => {
  it('accepts a non-negative amount in a supported unit', () => {
    expect(quantitySchema.parse({ amount: 0, unit: 'g' })).toEqual({
      amount: 0,
      unit: 'g',
    });
  });

  it.each([
    { amount: -1, unit: 'g' },
    { amount: Number.POSITIVE_INFINITY, unit: 'g' },
    { amount: 1, unit: 'stone' },
  ])('rejects an invalid quantity: %o', (quantity) => {
    expect(quantitySchema.safeParse(quantity).success).toBe(false);
  });
});

describe('nutritionFactsSchema', () => {
  it('preserves known zeroes and omitted unknown values', () => {
    const result = nutritionFactsSchema.parse({
      caloriesKcal: 0,
      proteinG: 0,
      micronutrients: {},
    });

    expect(result.proteinG).toBe(0);
    expect(result.carbohydratesG).toBeUndefined();
  });

  it('rejects negative and unsupported nutrient values', () => {
    expect(
      nutritionFactsSchema.safeParse({
        caloriesKcal: -1,
        micronutrients: {},
      }).success,
    ).toBe(false);
    expect(
      nutritionFactsSchema.safeParse({
        caloriesKcal: 1,
        micronutrients: {
          unsupported: { amount: 1, unit: 'mg' },
        },
      }).success,
    ).toBe(false);
  });
});

describe('foodSchema', () => {
  it('accepts a complete Food record', () => {
    expect(foodSchema.parse(validFood)).toEqual(validFood);
  });

  it.each([
    { ...validFood, id: 'not-a-uuid' },
    { ...validFood, name: '   ' },
    { ...validFood, servingSize: { amount: 0, unit: 'item' } },
    { ...validFood, createdAt: '2026-10-18T18:00:00-07:00' },
  ])('rejects an invalid Food record', (food) => {
    expect(foodSchema.safeParse(food).success).toBe(false);
  });

  it('rejects undeclared fields', () => {
    expect(
      foodSchema.safeParse({ ...validFood, barcode: '012345678905' }).success,
    ).toBe(false);
  });
});
