import {
  localDateSchema,
  type NutritionGoal,
} from './nutritionGoal.js';

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
