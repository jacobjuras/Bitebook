import type { Food, FoodCreateInput } from '@bitebook/domain';

export type FoodFormValues = Pick<
  Food,
  'isFavorite' | 'name' | 'nutritionFacts' | 'servingSize'
> & Pick<FoodCreateInput, 'newTags' | 'tagIds'>;
