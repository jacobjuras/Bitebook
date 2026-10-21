import { describe, expect, it } from 'vitest';

import { nutritionFactsSchema } from '../nutritionFacts.js';

describe('nutritionFactsSchema', () => {
  it('distinguishes known zeroes from unknown omitted nutrients', () => {
    const result = nutritionFactsSchema.parse({
      caloriesKcal: 0,
      proteinG: 0,
      micronutrients: {},
    });

    expect(result.proteinG).toBe(0);
    expect(result.carbohydratesG).toBeUndefined();
  });

  it.each([
    {
      caloriesKcal: -1,
      micronutrients: {},
    },
    {
      caloriesKcal: 1,
      micronutrients: {
        unsupported: { amount: 1, unit: 'mg' },
      },
    },
    {
      caloriesKcal: 1,
      micronutrients: {
        sodium: { amount: 1, unit: 'kcal' },
      },
    },
  ])('rejects invalid nutrition facts: %o', (nutritionFacts) => {
    expect(nutritionFactsSchema.safeParse(nutritionFacts).success).toBe(false);
  });
});
