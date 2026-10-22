import { describe, expect, it } from 'vitest';

import { scaleNutritionFacts } from '../nutrition.js';

const nutritionFacts = {
  caloriesKcal: 100,
  fatG: 4,
  sugarG: 0,
  micronutrients: {
    sodium: { amount: 80, unit: 'mg' },
  },
} as const;

const completeNutritionFacts = {
  caloriesKcal: 100,
  fatG: 10,
  saturatedFatG: 3,
  transFatG: 1,
  cholesterolMg: 20,
  carbohydratesG: 30,
  fiberG: 5,
  sugarG: 12,
  addedSugarG: 4,
  proteinG: 8,
  micronutrients: {
    sodium: { amount: 100, unit: 'mg' },
    potassium: { amount: 200, unit: 'mg' },
    calcium: { amount: 300, unit: 'mg' },
    iron: { amount: 4, unit: 'mg' },
  },
} as const;

describe('scaleNutritionFacts', () => {
  it('scales nutrients to the consumed number of servings', () => {
    expect(
      scaleNutritionFacts(
        nutritionFacts,
        { amount: 100, unit: 'g' },
        { amount: 250, unit: 'g' },
      ),
    ).toEqual({
      caloriesKcal: 250,
      fatG: 10,
      sugarG: 0,
      micronutrients: {
        sodium: { amount: 200, unit: 'mg' },
      },
    });
  });

  it('scales every supported nutrient', () => {
    expect(
      scaleNutritionFacts(
        completeNutritionFacts,
        { amount: 1, unit: 'item' },
        { amount: 2, unit: 'item' },
      ),
    ).toEqual({
      caloriesKcal: 200,
      fatG: 20,
      saturatedFatG: 6,
      transFatG: 2,
      cholesterolMg: 40,
      carbohydratesG: 60,
      fiberG: 10,
      sugarG: 24,
      addedSugarG: 8,
      proteinG: 16,
      micronutrients: {
        sodium: { amount: 200, unit: 'mg' },
        potassium: { amount: 400, unit: 'mg' },
        calcium: { amount: 600, unit: 'mg' },
        iron: { amount: 8, unit: 'mg' },
      },
    });
  });

  it('converts the consumed quantity to the serving unit', () => {
    const result = scaleNutritionFacts(
      nutritionFacts,
      { amount: 1, unit: 'oz' },
      { amount: 28.349_523_125, unit: 'g' },
    );

    expect(result.caloriesKcal).toBeCloseTo(100);
  });

  it('preserves omitted nutrients as unknown', () => {
    const result = scaleNutritionFacts(
      nutritionFacts,
      { amount: 1, unit: 'item' },
      { amount: 2, unit: 'item' },
    );

    expect(result).not.toHaveProperty('proteinG');
    expect(result.sugarG).toBe(0);
  });

  it('rejects an incompatible consumed quantity', () => {
    expect(() =>
      scaleNutritionFacts(
        nutritionFacts,
        { amount: 100, unit: 'g' },
        { amount: 1, unit: 'cup' },
      ),
    ).toThrow(RangeError);
  });

  it('rejects a zero serving size', () => {
    expect(() =>
      scaleNutritionFacts(
        nutritionFacts,
        { amount: 0, unit: 'g' },
        { amount: 1, unit: 'g' },
      ),
    ).toThrow(RangeError);
  });
});
