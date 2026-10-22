import type { Meal } from '@bitebook/domain';
import { describe, expect, it } from 'vitest';

import { getMealCardItem } from '../meal.js';

const baseMeal: Meal = {
  createdAt: '2026-10-20T14:00:00.000Z',
  id: '33333333-3333-4333-8333-333333333333',
  ingredients: [
    {
      foodId: '11111111-1111-4111-8111-111111111111',
      quantity: { amount: 100, unit: 'g' },
    },
  ],
  name: 'Chicken bowl',
  updatedAt: '2026-10-20T14:00:00.000Z',
  userId: 'user-123',
};

describe('getMealCardItem', () => {
  it('maps Meal identity and the singular ingredient count', () => {
    expect(getMealCardItem(baseMeal)).toEqual({
      details: [{ id: 'ingredient-count', text: '1 ingredient' }],
      id: baseMeal.id,
      title: baseMeal.name,
    });
  });

  it('uses the plural label for multiple ingredients', () => {
    const item = getMealCardItem({
      ...baseMeal,
      ingredients: [
        ...baseMeal.ingredients,
        {
          foodId: '22222222-2222-4222-8222-222222222222',
          quantity: { amount: 1, unit: 'item' },
        },
      ],
    });

    expect(item.details).toEqual([
      { id: 'ingredient-count', text: '2 ingredients' },
    ]);
  });
});
