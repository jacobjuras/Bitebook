import type { Food } from './food.js';
import type { Meal } from './meal.js';
import { convertQuantity } from './quantityConversion.js';

/** Calculates how many complete servings a Meal's current Food stock can provide. */
export function calculateAvailableServings(
  meal: Meal,
  foods: readonly Food[],
): number {
  const foodsById = new Map(foods.map((food) => [food.id, food]));

  return Math.floor(
    Math.min(
      ...meal.ingredients.map((ingredient) => {
        const food = foodsById.get(ingredient.foodId);

        if (food === undefined) {
          throw new RangeError(`Food ${ingredient.foodId} was not found`);
        }

        const stock = convertQuantity(
          food.currentStock,
          ingredient.quantity.unit,
        );
        return stock.amount / ingredient.quantity.amount;
      }),
    ),
  );
}
