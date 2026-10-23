import type { Food } from '@bitebook/domain';

export type FoodFormValues = Pick<
  Food,
  'isFavorite' | 'name' | 'nutritionFacts' | 'servingSize' | 'tags'
>;
