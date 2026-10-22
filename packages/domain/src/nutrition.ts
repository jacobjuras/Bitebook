import convert from 'convert';
import * as z from 'zod';

import type { Quantity } from './quantity.js';
import { convertQuantity } from './quantity.js';

const nutrientValueSchema = z.number().finite().nonnegative();

export const micronutrientSchema = z.enum([
  'sodium',
  'potassium',
  'calcium',
  'iron',
]);

export const nutrientAmountSchema = z.strictObject({
  amount: nutrientValueSchema,
  unit: z.enum(['g', 'mg', 'mcg']),
});

export const nutritionFactsSchema = z.strictObject({
  caloriesKcal: nutrientValueSchema,
  fatG: nutrientValueSchema.optional(),
  saturatedFatG: nutrientValueSchema.optional(),
  transFatG: nutrientValueSchema.optional(),
  cholesterolMg: nutrientValueSchema.optional(),
  carbohydratesG: nutrientValueSchema.optional(),
  fiberG: nutrientValueSchema.optional(),
  sugarG: nutrientValueSchema.optional(),
  addedSugarG: nutrientValueSchema.optional(),
  proteinG: nutrientValueSchema.optional(),
  micronutrients: z.partialRecord(
    micronutrientSchema,
    nutrientAmountSchema,
  ),
});

export type Micronutrient = z.infer<typeof micronutrientSchema>;
export type NutrientAmount = z.infer<typeof nutrientAmountSchema>;
export type NutritionFacts = z.infer<typeof nutritionFactsSchema>;

type ScalarNutrition = Omit<NutritionFacts, 'micronutrients'>;

/** Scales per-serving nutrition to an actual consumed quantity. */
export function scaleNutritionFacts(
  nutritionFacts: NutritionFacts,
  servingSize: Quantity,
  consumedQuantity: Quantity,
): NutritionFacts {
  if (servingSize.amount <= 0) {
    throw new RangeError('Serving size must be greater than zero');
  }

  const convertedQuantity = convertQuantity(
    consumedQuantity,
    servingSize.unit,
  );
  const scale = convertedQuantity.amount / servingSize.amount;
  const { micronutrients, ...nutrients } = nutritionFacts;
  const scaledNutrients = Object.fromEntries(
    Object.entries(nutrients).flatMap(([nutrient, amount]) =>
      amount === undefined ? [] : [[nutrient, amount * scale]],
    ),
  );
  const scaledMicronutrients = Object.fromEntries(
    Object.entries(micronutrients).map(([nutrient, value]) => [
      nutrient,
      { amount: value.amount * scale, unit: value.unit },
    ]),
  );

  return nutritionFactsSchema.parse({
    ...scaledNutrients,
    micronutrients: scaledMicronutrients,
  });
}

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
