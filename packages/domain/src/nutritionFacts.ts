import * as z from 'zod';

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
