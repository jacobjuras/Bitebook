import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listFoods: vi.fn(),
  listMeals: vi.fn(),
}));

vi.mock('../../api/foods.js', () => ({ listFoods: mocks.listFoods }));
vi.mock('../../api/meals.js', () => ({ listMeals: mocks.listMeals }));

import { foodsQueryOptions, mealsQueryOptions } from '../pantryQueries.js';

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

  it('keeps preloaded Food and Meal data in independent cache entries', async () => {
    const foods: never[] = [];
    const meals: never[] = [];
    mocks.listFoods.mockResolvedValue(foods);
    mocks.listMeals.mockResolvedValue(meals);

    await Promise.all([
      queryClient.query(foodsQueryOptions),
      queryClient.query(mealsQueryOptions),
    ]);

    expect(queryClient.getQueryData(['foods'])).toBe(foods);
    expect(queryClient.getQueryData(['meals'])).toBe(meals);
    expect(mocks.listFoods).toHaveBeenCalledOnce();
    expect(mocks.listMeals).toHaveBeenCalledOnce();
  });

  it('fetches Foods again after explicit invalidation', async () => {
    mocks.listFoods.mockResolvedValue([]);
    await queryClient.query(foodsQueryOptions);

    await queryClient.invalidateQueries({ queryKey: ['foods'] });
    await queryClient.query(foodsQueryOptions);

    expect(mocks.listFoods).toHaveBeenCalledTimes(2);
  });
});
