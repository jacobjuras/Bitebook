import type { Meal } from '@bitebook/domain';

import type { ItemCardModel } from '../../models/itemCard';

export function getMealCardItem(meal: Meal): ItemCardModel {
  return {
    details: [
      {
        id: 'ingredient-count',
        text: `${meal.ingredients.length} ${
          meal.ingredients.length === 1 ? 'ingredient' : 'ingredients'
        }`,
      },
    ],
    id: meal.id,
    title: meal.name,
  };
}
