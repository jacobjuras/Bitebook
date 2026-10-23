export function filterItems<Item extends {
  isFavorite?: boolean;
  name: string;
  tagIds?: readonly string[];
}>(
  items: readonly Item[],
  filters: {
    favorites: boolean;
    search: string;
    tagIds: readonly string[];
  },
): Item[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return items
    .filter(({ name }) => name.toLowerCase().includes(normalizedSearch))
    .filter(({ isFavorite }) => !filters.favorites || isFavorite === true)
    .filter(({ tagIds }) =>
      filters.tagIds.every((tagId) => tagIds?.includes(tagId)),
    );
}
