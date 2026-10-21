import type { Food } from '@bitebook/domain';

export enum FoodSortField {
  Recent = 'recent',
  Name = 'name',
  Calories = 'calories',
}

export enum SortDirection {
  Ascending = 'ascending',
  Descending = 'descending',
}

type FoodSortDefinition = {
  compare: (first: Food, second: Food) => number;
  directionLabels: Record<SortDirection, string>;
  directionOrder: readonly SortDirection[];
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
    directionLabels: {
      [SortDirection.Ascending]: 'Oldest first',
      [SortDirection.Descending]: 'Newest first',
    },
    directionOrder: [
      SortDirection.Descending,
      SortDirection.Ascending,
    ],
    label: 'Recent',
  },
  [FoodSortField.Name]: {
    compare: (first, second) => first.name.localeCompare(second.name),
    directionLabels: {
      [SortDirection.Ascending]: 'A–Z',
      [SortDirection.Descending]: 'Z–A',
    },
    directionOrder: [
      SortDirection.Ascending,
      SortDirection.Descending,
    ],
    label: 'Name',
  },
  [FoodSortField.Calories]: {
    compare: (first, second) =>
      first.nutritionFacts.caloriesKcal
      - second.nutritionFacts.caloriesKcal,
    directionLabels: {
      [SortDirection.Ascending]: 'Low to high',
      [SortDirection.Descending]: 'High to low',
    },
    directionOrder: [
      SortDirection.Ascending,
      SortDirection.Descending,
    ],
    label: 'Calories',
  },
};

export const foodSortFields = Object.values(FoodSortField);