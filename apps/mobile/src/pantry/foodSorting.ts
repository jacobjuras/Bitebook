import type { Food } from '@bitebook/domain';

export enum FoodSortField {
  Recent = 'recent',
  Name = 'name',
  Calories = 'calories',
}

export enum FoodSortDirection {
  Ascending = 'ascending',
  Descending = 'descending',
}

type FoodSortDefinition = {
  compare: (first: Food, second: Food) => number;
  directionLabels: Record<FoodSortDirection, string>;
  directionOrder: readonly FoodSortDirection[];
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
      [FoodSortDirection.Ascending]: 'Oldest first',
      [FoodSortDirection.Descending]: 'Newest first',
    },
    directionOrder: [
      FoodSortDirection.Descending,
      FoodSortDirection.Ascending,
    ],
    label: 'Recent',
  },
  [FoodSortField.Name]: {
    compare: (first, second) => first.name.localeCompare(second.name),
    directionLabels: {
      [FoodSortDirection.Ascending]: 'A–Z',
      [FoodSortDirection.Descending]: 'Z–A',
    },
    directionOrder: [
      FoodSortDirection.Ascending,
      FoodSortDirection.Descending,
    ],
    label: 'Name',
  },
  [FoodSortField.Calories]: {
    compare: (first, second) =>
      first.nutritionFacts.caloriesKcal
      - second.nutritionFacts.caloriesKcal,
    directionLabels: {
      [FoodSortDirection.Ascending]: 'Low to high',
      [FoodSortDirection.Descending]: 'High to low',
    },
    directionOrder: [
      FoodSortDirection.Ascending,
      FoodSortDirection.Descending,
    ],
    label: 'Calories',
  },
};

export const foodSortFields = Object.values(FoodSortField);

/** Checks whether a native menu event identifies a supported Food sort field. */
export function isFoodSortField(value: string): value is FoodSortField {
  return foodSortFields.includes(value as FoodSortField);
}

function isFoodSortDirection(value: string): value is FoodSortDirection {
  return Object.values(FoodSortDirection).includes(value as FoodSortDirection);
}

/** Parses a contextual Food sort menu selection into its field and direction. */
export function parseFoodSortSelection(value: string) {
  const parts = value.split(':');
  if (parts.length !== 3) return undefined;

  const [prefix, field, direction] = parts;
  if (
    prefix !== 'sort'
    || field === undefined
    || direction === undefined
    || !isFoodSortField(field)
    || !isFoodSortDirection(direction)
  ) {
    return undefined;
  }

  return { direction, field };
}
