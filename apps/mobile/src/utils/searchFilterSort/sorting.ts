import {
  type ItemSortField,
  type SortDirection,
  itemSortDefinitions,
} from '~/constants';
import type { SortableItem } from '~/models';

export function sortItems<Item>(
  items: readonly Item[],
  getSortableItem: (item: Item) => SortableItem,
  field: ItemSortField,
  direction: SortDirection,
): Item[] {
  return [...items].sort((first, second) => {
    const firstSortable = getSortableItem(first);
    const secondSortable = getSortableItem(second);
    const fieldComparison = itemSortDefinitions[field].compare(
      firstSortable,
      secondSortable,
    );
    const comparison = fieldComparison
      || firstSortable.name.localeCompare(secondSortable.name);

    return direction === 'ascending' ? comparison : -comparison;
  });
}
