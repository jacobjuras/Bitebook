import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listFoods: vi.fn(),
  listMeals: vi.fn(),
  listTags: vi.fn(),
}));

vi.mock('../../api/foods.js', () => ({ listFoods: mocks.listFoods }));
vi.mock('../../api/meals.js', () => ({ listMeals: mocks.listMeals }));
vi.mock('../../api/tags.js', () => ({ listTags: mocks.listTags }));

import {
  foodsQueryOptions,
  mealsQueryOptions,
  tagsQueryOptions,
} from '../pantryQueries.js';

let queryClient: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

describe('Pantry query caching', () => {
  it('reuses preloaded Foods without fetching again', async () => {
    const foods: never[] = [];
    mocks.listFoods.mockResolvedValue(foods);

    const preloadedFoods = await queryClient.query(foodsQueryOptions);
    const pantryFoods = await queryClient.query(foodsQueryOptions);

    expect(preloadedFoods).toBe(foods);
    expect(pantryFoods).toBe(foods);
    expect(mocks.listFoods).toHaveBeenCalledOnce();
  });

  it('keeps preloaded Food, Meal, and Tag data in independent cache entries', async () => {
    const foods: never[] = [];
    const meals: never[] = [];
    const tags: never[] = [];
    mocks.listFoods.mockResolvedValue(foods);
    mocks.listMeals.mockResolvedValue(meals);
    mocks.listTags.mockResolvedValue(tags);

    await Promise.all([
      queryClient.query(foodsQueryOptions),
      queryClient.query(mealsQueryOptions),
      queryClient.query(tagsQueryOptions),
    ]);

    expect(queryClient.getQueryData(['foods'])).toBe(foods);
    expect(queryClient.getQueryData(['meals'])).toBe(meals);
    expect(queryClient.getQueryData(['tags'])).toBe(tags);
    expect(mocks.listFoods).toHaveBeenCalledOnce();
    expect(mocks.listMeals).toHaveBeenCalledOnce();
    expect(mocks.listTags).toHaveBeenCalledOnce();
  });

  it('fetches Foods again after explicit invalidation', async () => {
    mocks.listFoods.mockResolvedValue([]);
    await queryClient.query(foodsQueryOptions);

    await queryClient.invalidateQueries({ queryKey: ['foods'] });
    await queryClient.query(foodsQueryOptions);

    expect(mocks.listFoods).toHaveBeenCalledTimes(2);
  });
});
