import { describe, expect, it } from 'vitest';

import { sumNutritionFacts } from '../nutritionTotals.js';
import type { NutritionFacts } from '../nutritionFacts.js';

describe('sumNutritionFacts', () => {
  it('sums complete nutrients and converts micronutrient units', () => {
    expect(
      sumNutritionFacts([
        {
          caloriesKcal: 100,
          proteinG: 10,
          micronutrients: {
            sodium: { amount: 100, unit: 'mg' },
          },
        },
        {
          caloriesKcal: 200,
          proteinG: 20,
          micronutrients: {
            sodium: { amount: 0.1, unit: 'g' },
          },
        },
      ]),
    ).toEqual({
      caloriesKcal: 300,
      proteinG: 30,
      micronutrients: {
        sodium: { amount: 200, unit: 'mg' },
      },
    });
  });

  it('treats absent nutrients as zero', () => {
    const result = sumNutritionFacts([
      {
        caloriesKcal: 100,
        proteinG: 10,
        sugarG: 0,
        micronutrients: {
          sodium: { amount: 100, unit: 'mg' },
        },
      },
      {
        caloriesKcal: 200,
        fiberG: 3,
        sugarG: 5,
        micronutrients: {
          potassium: { amount: 50, unit: 'mg' },
        },
      },
    ]);

    expect(result).toEqual({
      caloriesKcal: 300,
      proteinG: 10,
      fiberG: 3,
      sugarG: 5,
      micronutrients: {
        sodium: { amount: 100, unit: 'mg' },
        potassium: { amount: 50, unit: 'mg' },
      },
    });
  });

  it('omits a micronutrient whose runtime value is undefined', () => {
    const nutritionFacts = {
      caloriesKcal: 100,
      micronutrients: { sodium: undefined },
    } as unknown as NutritionFacts;

    expect(sumNutritionFacts([nutritionFacts])).toEqual({
      caloriesKcal: 100,
      micronutrients: {},
    });
  });

  it('requires at least one NutritionFacts value', () => {
    expect(() => sumNutritionFacts([])).toThrow(RangeError);
  });
});
