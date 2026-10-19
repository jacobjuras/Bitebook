import { describe, expect, it } from 'vitest';

import {
  findEffectiveNutritionGoal,
  type NutritionGoal,
} from '../src/index.js';

function createGoal(
  id: string,
  effectiveFrom: string,
  caloriesKcal: number,
): NutritionGoal {
  return {
    id,
    userId: 'user-123',
    caloriesKcal,
    effectiveFrom,
    createdAt: '2026-10-19T01:00:00Z',
  };
}

const earlierGoal = createGoal(
  '123e4567-e89b-42d3-a456-426614174000',
  '2026-10-01',
  2_000,
);
const currentGoal = createGoal(
  '123e4567-e89b-42d3-a456-426614174001',
  '2026-10-15',
  2_200,
);
const futureGoal = createGoal(
  '123e4567-e89b-42d3-a456-426614174002',
  '2026-11-01',
  2_400,
);

describe('findEffectiveNutritionGoal', () => {
  it('finds the latest goal effective on the target date', () => {
    expect(
      findEffectiveNutritionGoal(
        [futureGoal, earlierGoal, currentGoal],
        '2026-10-15',
      ),
    ).toEqual(currentGoal);
  });

  it('ignores goals that begin after the target date', () => {
    expect(
      findEffectiveNutritionGoal(
        [futureGoal, currentGoal, earlierGoal],
        '2026-10-20',
      ),
    ).toEqual(currentGoal);
  });

  it('returns undefined when no goal is effective yet', () => {
    expect(
      findEffectiveNutritionGoal([futureGoal], '2026-10-20'),
    ).toBeUndefined();
  });

  it('rejects an invalid local date', () => {
    expect(() =>
      findEffectiveNutritionGoal([currentGoal], '2026-02-30'),
    ).toThrow();
  });
});
