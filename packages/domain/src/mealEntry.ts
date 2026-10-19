import * as z from 'zod';

import { foodSchema } from './food.js';
import { ingredientSchema } from './meal.js';

const foodSnapshotSchema = foodSchema.pick({
  name: true,
  servingSize: true,
  nutritionFacts: true,
});

export const loggedIngredientSchema = ingredientSchema.extend({
  foodSnapshot: foodSnapshotSchema,
});

export const mealEntrySourceSchema = z.strictObject({
  type: z.enum(['food', 'meal']),
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
});

export const preparationSchema = z.enum([
  'homePrepared',
  'preparedElsewhere',
]);

export const mealEntrySchema = z.strictObject({
  id: z.uuid(),
  userId: z.string().min(1),
  source: mealEntrySourceSchema,
  ingredients: z.array(loggedIngredientSchema).min(1),
  scheduledAt: z.iso.datetime(),
  preparation: preparationSchema,
  affectsStock: z.boolean(),
  stockAppliedAt: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type LoggedIngredient = z.infer<typeof loggedIngredientSchema>;
export type MealEntrySource = z.infer<typeof mealEntrySourceSchema>;
export type Preparation = z.infer<typeof preparationSchema>;
export type MealEntry = z.infer<typeof mealEntrySchema>;
