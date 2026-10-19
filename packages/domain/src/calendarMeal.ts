import * as z from 'zod';

import { mealEntrySchema } from './mealEntry.js';
import { nutritionFactsSchema } from './nutritionFacts.js';

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
