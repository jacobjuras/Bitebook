import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FoodFormValues } from '~/models';
const mocks = vi.hoisted(() => ({
  authenticatedApiRequest: vi.fn(),
}));

vi.mock('../apiClient.js', () => ({
  authenticatedApiRequest: mocks.authenticatedApiRequest,
}));

import { createFood, listFoods, updateFood } from '../foods.js';

const foods = [
  {
    createdAt: '2026-10-20T12:00:00.000Z',
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Chicken breast',
    nutritionFacts: {
      caloriesKcal: 165,
      micronutrients: {},
      proteinG: 31,
    },
    servingSize: { amount: 100, unit: 'g' },
    updatedAt: '2026-10-20T12:00:00.000Z',
    userId: 'user-123',
  },
  {
    createdAt: '2026-10-20T13:00:00.000Z',
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Greek yogurt',
    nutritionFacts: {
      caloriesKcal: 100,
      micronutrients: {
        calcium: { amount: 110, unit: 'mg' },
      },
    },
    servingSize: { amount: 1, unit: 'item' },
    updatedAt: '2026-10-20T13:00:00.000Z',
    userId: 'user-123',
  },
];

beforeEach(() => vi.clearAllMocks());

describe('Foods API', () => {
  it('requests and returns the authenticated user’s Foods', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify({ foods })),
    );

    await expect(listFoods()).resolves.toEqual(foods);
    expect(mocks.authenticatedApiRequest).toHaveBeenCalledOnce();
    expect(mocks.authenticatedApiRequest).toHaveBeenCalledWith('foods');
  });

  it('accepts legacy Foods without exposing their stock field', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify({
        foods: [{
          ...foods[0],
          currentStock: { amount: 1200, unit: 'g' },
        }],
      })),
    );

    await expect(listFoods()).resolves.toEqual([foods[0]]);
  });

  it('returns an empty Food list when the API response is empty', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify({ foods: [] })),
    );

    await expect(listFoods()).resolves.toEqual([]);
  });

  it('rejects a response without a Foods list', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(new Response('{}'));

    await expect(listFoods()).rejects.toThrow('invalid Foods response');
  });

  it.each([
    ['a non-array Foods value', { foods: 'invalid' }],
    ['a non-object Food', { foods: [null] }],
  ])('rejects %s', async (_case, body) => {
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify(body)),
    );

    await expect(listFoods()).rejects.toThrow();
  });

  it('creates and validates a Food', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify(foods[0])),
    );
    const input: FoodFormValues = {
      isFavorite: true,
      name: 'Chicken breast',
      nutritionFacts: {
        caloriesKcal: 165,
        micronutrients: {},
        proteinG: 31,
      },
      servingSize: { amount: 100, unit: 'g' },
      tags: ['high-protein'],
    };

    await expect(createFood(input)).resolves.toEqual(foods[0]);
    expect(mocks.authenticatedApiRequest).toHaveBeenCalledWith('foods', {
      body: JSON.stringify(input),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
  });

  it('rejects an invalid Food creation response', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(new Response('{}'));

    await expect(createFood({
      name: 'Invalid response',
      nutritionFacts: { caloriesKcal: 100, micronutrients: {} },
      servingSize: { amount: 1, unit: 'item' },
    })).rejects.toThrow();
  });

  it('updates Food organization metadata', async () => {
    const updatedFood = {
      ...foods[0],
      isFavorite: true,
      tags: ['high-protein'],
    };
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify({ food: updatedFood })),
    );

    await expect(updateFood(foods[0].id, {
      isFavorite: true,
      tags: ['high-protein'],
    })).resolves.toEqual(updatedFood);
    expect(mocks.authenticatedApiRequest).toHaveBeenCalledWith(
      `foods/${foods[0].id}`,
      {
        body: JSON.stringify({
          isFavorite: true,
          tags: ['high-protein'],
        }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      },
    );
  });

  it('rejects an invalid Food update response', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(new Response('{}'));

    await expect(updateFood(foods[0].id, { isFavorite: true }))
      .rejects.toThrow('invalid Food response');
  });

  it('rejects a Food that violates the domain schema', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify({
        foods: [{
          ...foods[0],
          servingSize: { amount: 0, unit: 'g' },
        }],
      })),
    );

    await expect(listFoods()).rejects.toThrow();
  });
});
