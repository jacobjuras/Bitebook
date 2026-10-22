import * as z from 'zod';

import { mealEntrySchema, type MealEntry } from './mealEntry.js';
import {
  nutritionFactsSchema,
  scaleNutritionFacts,
  sumNutritionFacts,
} from './nutrition.js';

export const calendarMealSchema = z
  .strictObject({
    startTime: z.iso.datetime(),
    endTime: z.iso.datetime(),
    entries: z.array(mealEntrySchema).min(1),
    nutritionTotals: nutritionFactsSchema,
  })
  .refine(({ startTime, endTime }) => startTime <= endTime, {
    message: 'Calendar Meal cannot end before it starts',
    path: ['endTime'],
  });

export type CalendarMeal = z.infer<typeof calendarMealSchema>;

const CALENDAR_MEAL_WINDOW_MS = 30 * 60 * 1_000;

/** Calculates nutrition from the exact ingredient quantities logged in an entry. */
function calculateEntryNutrition(entry: MealEntry) {
  return sumNutritionFacts(
    entry.ingredients.map(({ foodSnapshot, quantity }) =>
      scaleNutritionFacts(
        foodSnapshot.nutritionFacts,
        foodSnapshot.servingSize,
        quantity,
      ),
    ),
  );
}

/** Groups nearby MealEntries into chronological CalendarMeals for one time zone. */
export function groupCalendarMeals(
  entries: readonly MealEntry[],
  timeZone: string,
): CalendarMeal[] {
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const sortedEntries = [...entries].sort(
    (first, second) =>
      Date.parse(first.scheduledAt) - Date.parse(second.scheduledAt),
  );
  const groups: MealEntry[][] = [];

  for (const entry of sortedEntries) {
    const currentGroup = groups.at(-1);
    const previousEntry = currentGroup?.at(-1);
    const isNearby =
      previousEntry !== undefined &&
      Date.parse(entry.scheduledAt) - Date.parse(previousEntry.scheduledAt) <=
        CALENDAR_MEAL_WINDOW_MS;
    const isSameLocalDay =
      previousEntry !== undefined &&
      dayFormatter.format(new Date(entry.scheduledAt)) ===
        dayFormatter.format(new Date(previousEntry.scheduledAt));

    if (currentGroup !== undefined && isNearby && isSameLocalDay) {
      currentGroup.push(entry);
    } else {
      groups.push([entry]);
    }
  }

  return groups.map((group) => {
    const firstEntry = group[0];
    const lastEntry = group.at(-1);

    return calendarMealSchema.parse({
      startTime: firstEntry.scheduledAt,
      endTime: lastEntry?.scheduledAt ?? firstEntry.scheduledAt,
      entries: group,
      nutritionTotals: sumNutritionFacts(
        group.map(calculateEntryNutrition),
      ),
    });
  });
}
