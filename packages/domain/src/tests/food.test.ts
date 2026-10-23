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

  it('deduplicates optional Food Tag references', () => {
    const firstTagId = '123e4567-e89b-42d3-a456-426614174010';
    const secondTagId = '123e4567-e89b-42d3-a456-426614174011';

    expect(foodSchema.parse({
      ...validFood,
      isFavorite: true,
      lastLoggedAt: '2026-10-20T01:00:00Z',
      tagIds: [firstTagId, secondTagId, firstTagId],
    })).toEqual({
      ...validFood,
      isFavorite: true,
      lastLoggedAt: '2026-10-20T01:00:00Z',
      tagIds: [firstTagId, secondTagId],
    });
  });

  it.each([
    { ...validFood, tagIds: ['not-a-uuid'] },
    {
      ...validFood,
      tagIds: Array.from(
        { length: 11 },
        (_, index) => `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
      ),
    },
    { ...validFood, lastLoggedAt: 'yesterday' },
  ])('rejects invalid Food organization metadata: %o', (food) => {
    expect(foodSchema.safeParse(food).success).toBe(false);
  });

  it('rejects fields outside the persisted Food contract', () => {
    expect(
      foodSchema.safeParse({ ...validFood, barcode: '012345678905' }).success,
    ).toBe(false);
  });
});
