import {
  nutritionFactsSchema,
  type NutritionFacts,
} from './nutritionFacts.js';
import type { Quantity } from './quantity.js';
import { convertQuantity } from './quantityConversion.js';

export function scaleNutritionFacts(
  nutritionFacts: NutritionFacts,
  servingSize: Quantity,
  consumedQuantity: Quantity,
): NutritionFacts {
  if (servingSize.amount <= 0) {
    throw new RangeError('Serving size must be greater than zero');
  }

  const convertedQuantity = convertQuantity(
    consumedQuantity,
    servingSize.unit,
  );
  const scale = convertedQuantity.amount / servingSize.amount;
  const { micronutrients, ...nutrients } = nutritionFacts;
  const scaledNutrients = Object.fromEntries(
    Object.entries(nutrients).flatMap(([nutrient, amount]) =>
      amount === undefined ? [] : [[nutrient, amount * scale]],
    ),
  );
  const scaledMicronutrients = Object.fromEntries(
    Object.entries(micronutrients).map(([nutrient, value]) => [
      nutrient,
      { amount: value.amount * scale, unit: value.unit },
    ]),
  );

  return nutritionFactsSchema.parse({
    ...scaledNutrients,
    micronutrients: scaledMicronutrients,
  });
}
