import { mealSchema, type Meal } from '@bitebook/domain';

import { authenticatedApiRequest } from './apiClient';

/** Loads and validates the authenticated user's Meals. */
export async function listMeals(): Promise<Meal[]> {
  const response = await authenticatedApiRequest('meals');
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('meals' in body)) {
    throw new Error('Bitebook API returned an invalid Meals response');
  }
  return mealSchema.array().parse(body.meals);
}
