import type { Micronutrient, NutritionFacts, Unit } from '@bitebook/domain';

export const foodServingUnits: readonly { id: Unit; label: string }[] = [
  { id: 'g', label: 'g' },
  { id: 'kg', label: 'kg' },
  { id: 'oz', label: 'oz' },
  { id: 'lb', label: 'lb' },
  { id: 'ml', label: 'mL' },
  { id: 'l', label: 'L' },
  { id: 'tsp', label: 'tsp' },
  { id: 'tbsp', label: 'tbsp' },
  { id: 'cup', label: 'cup' },
  { id: 'flOz', label: 'fl oz' },
  { id: 'item', label: 'item' },
];

export const foodNutrientFields: readonly {
  id: Exclude<keyof NutritionFacts, 'caloriesKcal' | 'micronutrients'>;
  label: string;
  unit: string;
}[] = [
  { id: 'proteinG', label: 'Protein', unit: 'g' },
  { id: 'carbohydratesG', label: 'Carbohydrates', unit: 'g' },
  { id: 'fatG', label: 'Fat', unit: 'g' },
  { id: 'saturatedFatG', label: 'Saturated fat', unit: 'g' },
  { id: 'transFatG', label: 'Trans fat', unit: 'g' },
  { id: 'cholesterolMg', label: 'Cholesterol', unit: 'mg' },
  { id: 'fiberG', label: 'Fiber', unit: 'g' },
  { id: 'sugarG', label: 'Sugar', unit: 'g' },
  { id: 'addedSugarG', label: 'Added sugar', unit: 'g' },
];

export const foodMicronutrientFields: readonly {
  id: Micronutrient;
  label: string;
  unit: 'mg';
}[] = [
  { id: 'sodium', label: 'Sodium', unit: 'mg' },
  { id: 'potassium', label: 'Potassium', unit: 'mg' },
  { id: 'calcium', label: 'Calcium', unit: 'mg' },
  { id: 'iron', label: 'Iron', unit: 'mg' },
];
