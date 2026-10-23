import type { Food, Meal } from '@bitebook/domain';
import { describe, expect, it, vi } from 'vitest';

vi.mock('~/components', () => ({
  FavoriteIndicator: 'FavoriteIndicator',
}));

import { FavoriteIndicator } from '~/components';
import { tagFixtures } from '~/tests/fixtures/tags';
import { getMealCardItem, getSortableMeal } from '../meal.js';

const tags = [tagFixtures.breakfast, tagFixtures.highProtein];
const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
const baseFood: Food = {
  createdAt: '2026-10-20T12:00:00.000Z',
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Chicken breast',
  nutritionFacts: { caloriesKcal: 200, micronutrients: {} },
  servingSize: { amount: 100, unit: 'g' },
  updatedAt: '2026-10-20T12:00:00.000Z',
  userId: 'user-123',
};
const baseMeal: Meal = {
  createdAt: '2026-10-20T14:00:00.000Z',
  id: '33333333-3333-4333-8333-333333333333',
  ingredients: [
    {
      foodId: baseFood.id,
      quantity: { amount: 100, unit: 'g' },
    },
  ],
  name: 'Chicken bowl',
  updatedAt: '2026-10-20T14:00:00.000Z',
  userId: 'user-123',
};

describe('getMealCardItem', () => {
  it('maps Meal identity and the singular ingredient count', () => {
    expect(getMealCardItem(baseMeal, tagsById)).toEqual({
      accessory: undefined,
      chips: undefined,
      details: [{ id: 'ingredient-count', text: '1 ingredient' }],
      id: baseMeal.id,
      title: baseMeal.name,
    });
  });

  it('maps resolved Tags and favorite state into card organization', () => {
    const item = getMealCardItem({
      ...baseMeal,
      isFavorite: true,
      tagIds: tags.map(({ id }) => id),
    }, tagsById);
    const accessory = item.accessory?.('pantry-meal-item');

    expect(item.chips).toEqual([
      { id: tags[0].id, label: 'breakfast' },
      { id: tags[1].id, label: 'high-protein' },
    ]);
    expect(accessory).toMatchObject({
      props: { testIDPrefix: 'pantry-meal-item' },
      type: FavoriteIndicator,
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
    }, tagsById);

    expect(item.details).toEqual([
      { id: 'ingredient-count', text: '2 ingredients' },
    ]);
  });
});

describe('getSortableMeal', () => {
  it('projects Meal identity, recency, and quantity-scaled calories', () => {
    const meal = {
      ...baseMeal,
      ingredients: [
        {
          foodId: baseFood.id,
          quantity: { amount: 50, unit: 'g' as const },
        },
      ],
    };

    expect(getSortableMeal(meal, new Map([[baseFood.id, baseFood]]))).toEqual({
      caloriesKcal: 100,
      name: baseMeal.name,
      recentAt: baseMeal.createdAt,
    });
  });

  it('sums available ingredients without crashing on a deleted Food', () => {
    const meal = {
      ...baseMeal,
      ingredients: [
        ...baseMeal.ingredients,
        {
          foodId: '22222222-2222-4222-8222-222222222222',
          quantity: { amount: 1, unit: 'item' as const },
        },
      ],
    };

    expect(
      getSortableMeal(meal, new Map([[baseFood.id, baseFood]])).caloriesKcal,
    ).toBe(200);
  });
});
