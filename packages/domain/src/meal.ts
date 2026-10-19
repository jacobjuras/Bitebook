import * as z from 'zod';

import { quantitySchema } from './quantity.js';

const ingredientQuantitySchema = quantitySchema.refine(
  ({ amount }) => amount > 0,
  'Ingredient quantity must be greater than zero',
);

export const ingredientSchema = z.strictObject({
  foodId: z.uuid(),
  quantity: ingredientQuantitySchema,
});

const ingredientsSchema = z
  .array(ingredientSchema)
  .min(1)
  .refine(
    (ingredients) =>
      new Set(ingredients.map(({ foodId }) => foodId)).size ===
      ingredients.length,
    'A Food can appear only once in a Meal',
  );

export const mealSchema = z.strictObject({
  id: z.uuid(),
  userId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  ingredients: ingredientsSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Ingredient = z.infer<typeof ingredientSchema>;
export type Meal = z.infer<typeof mealSchema>;
