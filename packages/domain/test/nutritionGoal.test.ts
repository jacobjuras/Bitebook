import { describe, expect, it } from 'vitest';

import { nutritionGoalSchema } from '../src/index.js';

const validGoal = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  userId: 'user-123',
  caloriesKcal: 2_000,
  effectiveFrom: '2026-10-19',
  createdAt: '2026-10-19T01:00:00Z',
};

describe('nutritionGoalSchema', () => {
  it('accepts a positive calorie target with a local effective date', () => {
    expect(nutritionGoalSchema.parse(validGoal)).toEqual(validGoal);
  });

  it.each([0, -1, Number.POSITIVE_INFINITY])(
    'rejects an invalid calorie target: %s',
    (caloriesKcal) => {
      expect(
        nutritionGoalSchema.safeParse({ ...validGoal, caloriesKcal }).success,
      ).toBe(false);
    },
  );

  it.each(['2026-02-30', '2026-10-19T00:00:00Z', '10/19/2026'])(
    'rejects an invalid effective date: %s',
    (effectiveFrom) => {
      expect(
        nutritionGoalSchema.safeParse({ ...validGoal, effectiveFrom }).success,
      ).toBe(false);
    },
  );
});
