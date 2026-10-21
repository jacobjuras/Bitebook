import { foodSchema, type Food } from '@bitebook/domain';

import { authenticatedApiRequest } from './apiClient';

/** Loads and validates the authenticated user's Foods. */
export async function listFoods(): Promise<Food[]> {
  const response = await authenticatedApiRequest('foods');
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('foods' in body)) {
    throw new Error('Bitebook API returned an invalid Foods response');
  }
  return foodSchema.array().parse(body.foods);
}
