import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticatedApiRequest: vi.fn(),
}));

vi.mock('../apiClient.js', () => ({
  authenticatedApiRequest: mocks.authenticatedApiRequest,
}));

import { listMeals } from '../meals.js';

const meals = [
  {
    createdAt: '2026-10-20T12:00:00.000Z',
    id: '33333333-3333-4333-8333-333333333333',
    ingredients: [
      {
        foodId: '11111111-1111-4111-8111-111111111111',
        quantity: { amount: 100, unit: 'g' },
      },
    ],
    name: 'Chicken bowl',
    isFavorite: true,
    tagIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
    updatedAt: '2026-10-20T12:00:00.000Z',
    userId: 'user-123',
  },
];

beforeEach(() => vi.clearAllMocks());

describe('Meals API', () => {
  it('requests and returns the authenticated user’s Meals', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify({ meals })),
    );

    await expect(listMeals()).resolves.toEqual(meals);
    expect(mocks.authenticatedApiRequest).toHaveBeenCalledOnce();
    expect(mocks.authenticatedApiRequest).toHaveBeenCalledWith('meals');
  });

  it('returns an empty Meal list when the API response is empty', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify({ meals: [] })),
    );

    await expect(listMeals()).resolves.toEqual([]);
  });

  it('rejects a response without a Meals list', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(new Response('{}'));

    await expect(listMeals()).rejects.toThrow('invalid Meals response');
  });

  it('rejects a Meal that violates the domain schema', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify({
        meals: [{ ...meals[0], ingredients: [] }],
      })),
    );

    await expect(listMeals()).rejects.toThrow();
  });
});
