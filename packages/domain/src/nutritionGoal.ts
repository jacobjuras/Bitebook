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

/** Finds the most recent NutritionGoal effective on or before a local date. */
export function findEffectiveNutritionGoal(
  goals: readonly NutritionGoal[],
  localDate: string,
): NutritionGoal | undefined {
  const targetDate = localDateSchema.parse(localDate);

  return goals.reduce<NutritionGoal | undefined>((effectiveGoal, goal) => {
    if (goal.effectiveFrom > targetDate) {
      return effectiveGoal;
    }

    if (
      effectiveGoal === undefined ||
      goal.effectiveFrom > effectiveGoal.effectiveFrom
    ) {
      return goal;
    }

    return effectiveGoal;
  }, undefined);
}
