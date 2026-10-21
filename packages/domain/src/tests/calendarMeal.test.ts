import { describe, expect, it } from 'vitest';

import { calendarMealSchema } from '../calendarMeal.js';

const entry = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  userId: 'user-123',
  source: {
    type: 'food',
    id: '123e4567-e89b-42d3-a456-426614174001',
    name: 'Banana',
  },
  ingredients: [
    {
      foodId: '123e4567-e89b-42d3-a456-426614174001',
      quantity: { amount: 1, unit: 'item' },
      foodSnapshot: {
        name: 'Banana',
        servingSize: { amount: 1, unit: 'item' },
        nutritionFacts: { caloriesKcal: 105, micronutrients: {} },
      },
    },
  ],
  scheduledAt: '2026-10-19T12:00:00Z',
  preparation: 'homePrepared',
  createdAt: '2026-10-19T12:00:00Z',
  updatedAt: '2026-10-19T12:00:00Z',
};

const validCalendarMeal = {
  startTime: '2026-10-19T12:00:00Z',
  endTime: '2026-10-19T12:30:00Z',
  entries: [entry],
  nutritionTotals: { caloriesKcal: 105, micronutrients: {} },
};

describe('calendarMealSchema', () => {
  it('accepts grouped entries and their nutrition totals', () => {
    expect(calendarMealSchema.parse(validCalendarMeal)).toEqual(
      validCalendarMeal,
    );
  });

  it('requires at least one MealEntry', () => {
    expect(
      calendarMealSchema.safeParse({
        ...validCalendarMeal,
        entries: [],
      }).success,
    ).toBe(false);
  });

  it('cannot end before it starts', () => {
    expect(
      calendarMealSchema.safeParse({
        ...validCalendarMeal,
        endTime: '2026-10-19T11:59:59Z',
      }).success,
    ).toBe(false);
  });
});
