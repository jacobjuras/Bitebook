export type SortableItem = {
  caloriesKcal: number;
  name: string;
  recentAt: string;
};

export enum ItemSortField {
  Recent = 'recent',
  Name = 'name',
  Calories = 'calories',
}

export enum SortDirection {
  Ascending = 'ascending',
  Descending = 'descending',
}

export const itemSortDefinitions: Record<
  ItemSortField,
  {
    compare: (first: SortableItem, second: SortableItem) => number;
    directionLabels: Record<SortDirection, string>;
    directionOrder: readonly SortDirection[];
    label: string;
  }
> = {
  [ItemSortField.Recent]: {
    compare: (first, second) =>
      Date.parse(first.recentAt) - Date.parse(second.recentAt),
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
  [ItemSortField.Name]: {
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
  [ItemSortField.Calories]: {
    compare: (first, second) => first.caloriesKcal - second.caloriesKcal,
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

export const itemSortFields = Object.values(ItemSortField);
