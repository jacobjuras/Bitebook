import {
  scaleNutritionFacts,
  type Food,
  type Meal,
} from '@bitebook/domain';

import type { ItemCardModel, SortableItem } from '~/models';

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

/** Projects a Meal into shared sort fields using its current Food nutrition. */
export function getSortableMeal(
  meal: Meal,
  foodsById: ReadonlyMap<string, Food>,
): SortableItem {
  const caloriesKcal = meal.ingredients.reduce((total, ingredient) => {
    const food = foodsById.get(ingredient.foodId);
    return food === undefined
      ? total
      : total + scaleNutritionFacts(
          food.nutritionFacts,
          food.servingSize,
          ingredient.quantity,
        ).caloriesKcal;
  }, 0);

  return {
    caloriesKcal,
    name: meal.name,
    recentAt: meal.createdAt,
  };
}
