import type { Food } from '@bitebook/domain';

export enum FoodSortField {
  Recent = 'recent',
  Name = 'name',
  Calories = 'calories',
}

type FoodSortDefinition = {
  compare: (first: Food, second: Food) => number;
  label: string;
};

export const foodSortDefinitions: Record<
  FoodSortField,
  FoodSortDefinition
> = {
  [FoodSortField.Recent]: {
    compare: (first, second) =>
      Date.parse(first.lastLoggedAt ?? first.createdAt)
      - Date.parse(second.lastLoggedAt ?? second.createdAt),
    label: 'Recent',
  },
  [FoodSortField.Name]: {
    compare: (first, second) => first.name.localeCompare(second.name),
    label: 'Name',
  },
  [FoodSortField.Calories]: {
    compare: (first, second) =>
      first.nutritionFacts.caloriesKcal
      - second.nutritionFacts.caloriesKcal,
    label: 'Calories',
  },
};

export const foodSortFields = Object.values(FoodSortField);

/** Checks whether a native menu event identifies a supported Food sort field. */
export function isFoodSortField(value: string): value is FoodSortField {
  return foodSortFields.includes(value as FoodSortField);
}
