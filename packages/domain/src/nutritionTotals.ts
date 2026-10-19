import convert from 'convert';

import {
  nutritionFactsSchema,
  type Micronutrient,
  type NutritionFacts,
} from './nutritionFacts.js';

type ScalarNutrition = Omit<NutritionFacts, 'micronutrients'>;

/** Sums nutrition values while treating absent nutrients as zero and normalizing micronutrient units. */
export function sumNutritionFacts(
  nutritionValues: readonly NutritionFacts[],
): NutritionFacts {
  if (nutritionValues.length === 0) {
    throw new RangeError('At least one NutritionFacts value is required');
  }

  const nutrientNames = new Set(
    nutritionValues.flatMap(({ micronutrients: _, ...nutrients }) =>
      Object.keys(nutrients),
    ),
  );
  const summedNutrients = Object.fromEntries(
    [...nutrientNames].map((name) => {
      const nutrient = name as keyof ScalarNutrition;
      const amount = nutritionValues.reduce(
        (total, value) => total + (value[nutrient] ?? 0),
        0,
      );
      return [nutrient, amount];
    }),
  );

  const micronutrientNames = new Set(
    nutritionValues.flatMap((value) =>
      Object.keys(value.micronutrients),
    ),
  );
  const summedMicronutrients = Object.fromEntries(
    [...micronutrientNames].flatMap((name) => {
      const nutrient = name as Micronutrient;
      const values = nutritionValues.flatMap((value) => {
        const amount = value.micronutrients[nutrient];
        return amount === undefined ? [] : [amount];
      });
      const firstValue = values[0];

      if (firstValue === undefined) {
        return [];
      }

      return [
        [
          nutrient,
          {
            amount: values.reduce(
              (total, value) =>
                total + convert(value.amount, value.unit).to(firstValue.unit),
              0,
            ),
            unit: firstValue.unit,
          },
        ],
      ];
    }),
  );

  return nutritionFactsSchema.parse({
    ...summedNutrients,
    micronutrients: summedMicronutrients,
  });
}
