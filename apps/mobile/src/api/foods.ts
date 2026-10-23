import { foodSchema, type Food } from '@bitebook/domain';

import type { FoodFormValues } from '~/models';
import { authenticatedApiRequest } from './apiClient';

type FoodUpdate = Partial<Pick<
  Food,
  'isFavorite' | 'name' | 'nutritionFacts' | 'servingSize' | 'tags'
>>;

function parseFood(value: unknown): Food {
  if (!value || typeof value !== 'object') return foodSchema.parse(value);
  const food = { ...(value as Record<string, unknown>) };
  delete food.currentStock;
  return foodSchema.parse(food);
}

/** Loads and validates the authenticated user's Foods. */
export async function listFoods(): Promise<Food[]> {
  const response = await authenticatedApiRequest('foods');
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('foods' in body)) {
    throw new Error('Bitebook API returned an invalid Foods response');
  }
  if (!Array.isArray(body.foods)) return foodSchema.array().parse(body.foods);
  return body.foods.map(parseFood);
}

/** Creates and validates one Food for the authenticated user. */
export async function createFood(input: FoodFormValues): Promise<Food> {
  const response = await authenticatedApiRequest('foods', {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  return parseFood(await response.json());
}

/** Updates mutable metadata for one authenticated user's Food. */
export async function updateFood(
  foodId: string,
  update: FoodUpdate,
): Promise<Food> {
  const response = await authenticatedApiRequest(`foods/${foodId}`, {
    body: JSON.stringify(update),
    headers: { 'content-type': 'application/json' },
    method: 'PATCH',
  });
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('food' in body)) {
    throw new Error('Bitebook API returned an invalid Food response');
  }
  return parseFood(body.food);
}
