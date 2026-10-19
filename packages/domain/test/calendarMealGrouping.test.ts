import { describe, expect, it } from 'vitest';

import { groupCalendarMeals, type MealEntry } from '../src/index.js';

function createEntry(
  id: string,
  scheduledAt: string,
  caloriesKcal: number,
  quantity = 1,
): MealEntry {
  return {
    id,
    userId: 'user-123',
    source: {
      type: 'food',
      id: '123e4567-e89b-42d3-a456-426614174000',
      name: 'Food',
    },
    ingredients: [
      {
        foodId: '123e4567-e89b-42d3-a456-426614174000',
        quantity: { amount: quantity, unit: 'item' },
        foodSnapshot: {
          name: 'Food',
          servingSize: { amount: 1, unit: 'item' },
          nutritionFacts: { caloriesKcal, micronutrients: {} },
        },
      },
    ],
    scheduledAt,
    preparation: 'homePrepared',
    affectsStock: true,
    createdAt: '2026-10-19T01:00:00Z',
    updatedAt: '2026-10-19T01:00:00Z',
  };
}

const firstId = '123e4567-e89b-42d3-a456-426614174001';
const secondId = '123e4567-e89b-42d3-a456-426614174002';
const thirdId = '123e4567-e89b-42d3-a456-426614174003';

describe('groupCalendarMeals', () => {
  it('sorts and groups entries no more than 30 minutes apart', () => {
    const first = createEntry(firstId, '2026-10-19T12:00:00Z', 100);
    const second = createEntry(secondId, '2026-10-19T12:30:00Z', 200, 2);

    const [calendarMeal] = groupCalendarMeals(
      [second, first],
      'America/Los_Angeles',
    );

    expect(calendarMeal.startTime).toBe(first.scheduledAt);
    expect(calendarMeal.endTime).toBe(second.scheduledAt);
    expect(calendarMeal.entries.map(({ id }) => id)).toEqual([
      firstId,
      secondId,
    ]);
    expect(calendarMeal.nutritionTotals.caloriesKcal).toBe(500);
  });

  it('uses a rolling 30-minute grouping window', () => {
    const meals = groupCalendarMeals(
      [
        createEntry(firstId, '2026-10-19T12:00:00Z', 100),
        createEntry(secondId, '2026-10-19T12:30:00Z', 100),
        createEntry(thirdId, '2026-10-19T13:00:00Z', 100),
      ],
      'UTC',
    );

    expect(meals).toHaveLength(1);
  });

  it('starts a new group after a gap longer than 30 minutes', () => {
    const meals = groupCalendarMeals(
      [
        createEntry(firstId, '2026-10-19T12:00:00Z', 100),
        createEntry(secondId, '2026-10-19T12:30:01Z', 100),
      ],
      'UTC',
    );

    expect(meals).toHaveLength(2);
  });

  it('does not group entries across local calendar days', () => {
    const meals = groupCalendarMeals(
      [
        createEntry(firstId, '2026-10-19T06:50:00Z', 100),
        createEntry(secondId, '2026-10-19T07:10:00Z', 100),
      ],
      'America/Los_Angeles',
    );

    expect(meals).toHaveLength(2);
  });

  it('returns no CalendarMeals for no entries', () => {
    expect(groupCalendarMeals([], 'UTC')).toEqual([]);
  });
});
