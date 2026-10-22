export function filterItems<Item extends {
  isFavorite?: boolean;
  name: string;
  tags?: readonly string[];
}>(
  items: readonly Item[],
  filters: {
    favorites: boolean;
    search: string;
    tags: readonly string[];
  },
): Item[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return items
    .filter(({ name }) => name.toLowerCase().includes(normalizedSearch))
    .filter(({ isFavorite }) => !filters.favorites || isFavorite === true)
    .filter(({ tags }) => filters.tags.every((tag) => tags?.includes(tag)));
}

export function getAvailableTags(
  items: readonly { tags?: readonly string[] }[],
): string[] {
  return [...new Set(items.flatMap(({ tags }) => tags ?? []))].sort();
}
