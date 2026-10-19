import * as z from 'zod';

export const localDateSchema = z.iso.date();

export const nutritionGoalSchema = z.strictObject({
  id: z.uuid(),
  userId: z.string().min(1),
  caloriesKcal: z.number().finite().positive(),
  effectiveFrom: localDateSchema,
  createdAt: z.iso.datetime(),
});

export type NutritionGoal = z.infer<typeof nutritionGoalSchema>;
