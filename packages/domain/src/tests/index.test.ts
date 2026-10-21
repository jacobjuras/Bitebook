import { describe, expect, it } from 'vitest';

import * as domain from '../index.js';

describe('domain public API', () => {
  it('exposes every runtime domain contract through the package entry point', () => {
    expect(Object.keys(domain).sort()).toEqual(
      [
        'MIN_PASSWORD_LENGTH',
        'areCompatibleUnits',
        'calendarMealSchema',
        'convertQuantity',
        'findEffectiveNutritionGoal',
        'foodSchema',
        'getMeasurementFamily',
        'groupCalendarMeals',
        'ingredientSchema',
        'localDateSchema',
        'loggedIngredientSchema',
        'mealEntrySchema',
        'mealEntrySourceSchema',
        'mealSchema',
        'micronutrientSchema',
        'nutrientAmountSchema',
        'nutritionFactsSchema',
        'nutritionGoalSchema',
        'preparationSchema',
        'quantitySchema',
        'scaleNutritionFacts',
        'sumNutritionFacts',
        'unitSchema',
        'userProfileSchema',
      ].sort(),
    );
  });
});
