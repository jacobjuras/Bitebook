export type SearchFilterSortModel<
  FilterId extends string,
  SortId extends string,
  DirectionId extends string,
> = {
  filters: {
    onClear?: () => void;
    onToggle?: (filterId: FilterId) => void;
    options: readonly {
      id: FilterId;
      label: string;
      selected: boolean;
    }[];
  };
  item: {
    name: string;
    pluralName: string;
  };
  search: {
    onChange: (value: string) => void;
    value: string;
  };
  sort: {
    activeDirectionId: DirectionId;
    activeId: SortId;
    onSelect: (sortId: SortId, directionId: DirectionId) => void;
    options: readonly {
      directions: readonly {
        id: DirectionId;
        label: string;
      }[];
      id: SortId;
      label: string;
    }[];
  };
};

export type SortableItem = {
  caloriesKcal: number;
  name: string;
  recentAt: string;
};
