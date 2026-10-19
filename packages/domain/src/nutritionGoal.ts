import * as z from 'zod';

export const nutritionGoalSchema = z.strictObject({
  id: z.uuid(),
  userId: z.string().min(1),
  caloriesKcal: z.number().finite().positive(),
  effectiveFrom: z.iso.date(),
  createdAt: z.iso.datetime(),
});

export type NutritionGoal = z.infer<typeof nutritionGoalSchema>;
