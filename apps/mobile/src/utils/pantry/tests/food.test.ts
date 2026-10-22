import type { Food } from '@bitebook/domain';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../components/FavoriteIndicator/FavoriteIndicator.js', () => ({
  FavoriteIndicator: 'FavoriteIndicator',
}));

import { FavoriteIndicator } from '../../../components/FavoriteIndicator/FavoriteIndicator.js';
import { getFoodCardItem, getSortableFood } from '../food.js';

const baseFood: Food = {
  createdAt: '2026-10-20T12:00:00.000Z',
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Greek yogurt',
  nutritionFacts: { caloriesKcal: 100, micronutrients: {} },
  servingSize: { amount: 1, unit: 'item' },
  updatedAt: '2026-10-20T12:00:00.000Z',
  userId: 'user-123',
};

describe('getFoodCardItem', () => {
  it('maps identity, calories, protein, and tags into card content', () => {
    const item = getFoodCardItem({
      ...baseFood,
      nutritionFacts: { caloriesKcal: 165, micronutrients: {}, proteinG: 31 },
      tags: ['high-protein', 'savory'],
    });

    expect(item).toMatchObject({
      chips: [
        { id: 'high-protein', label: 'high-protein' },
        { id: 'savory', label: 'savory' },
      ],
      details: [{ id: 'summary', text: '165 kcal · 31 g protein' }],
      id: baseFood.id,
      title: baseFood.name,
    });
  });

  it('omits optional protein, chips, and accessory when absent', () => {
    expect(getFoodCardItem(baseFood)).toEqual({
      accessory: undefined,
      chips: undefined,
      details: [{ id: 'summary', text: '100 kcal' }],
      id: baseFood.id,
      title: baseFood.name,
    });
  });

  it('includes zero grams of protein instead of treating it as absent', () => {
    const item = getFoodCardItem({
      ...baseFood,
      nutritionFacts: { caloriesKcal: 100, micronutrients: {}, proteinG: 0 },
    });

    expect(item.details).toEqual([
      { id: 'summary', text: '100 kcal · 0 g protein' },
    ]);
  });

  it('creates a favorite indicator with the card test-ID prefix', () => {
    const item = getFoodCardItem({ ...baseFood, isFavorite: true });
    const accessory = item.accessory?.('pantry-food-item');

    expect(accessory).toMatchObject({
      props: { testIDPrefix: 'pantry-food-item' },
      type: FavoriteIndicator,
    });
  });
});

describe('getSortableFood', () => {
  it('uses the last-logged timestamp when available', () => {
    expect(getSortableFood({
      ...baseFood,
      lastLoggedAt: '2026-10-21T10:00:00.000Z',
    })).toEqual({
      caloriesKcal: 100,
      name: 'Greek yogurt',
      recentAt: '2026-10-21T10:00:00.000Z',
    });
  });

  it('falls back to the creation timestamp when never logged', () => {
    expect(getSortableFood(baseFood).recentAt).toBe(baseFood.createdAt);
  });
});
