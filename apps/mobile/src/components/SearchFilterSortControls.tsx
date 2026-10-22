import Ionicons from '@expo/vector-icons/Ionicons';
import { MenuView } from '@expo/ui/community/menu';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '../theme/useThemeColors';

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

/** Renders reusable search, filter, and contextual sort controls for a list. */
export function SearchFilterSortControls<
  FilterId extends string,
  SortId extends string,
  DirectionId extends string,
>({
  model,
  testIDPrefix,
}: {
  model: SearchFilterSortModel<FilterId, SortId, DirectionId>;
  testIDPrefix: string;
}) {
  const {
    filters: {
      onClear: onClearFilters,
      onToggle: onToggleFilter,
      options: filters,
    },
    item: { name: itemName, pluralName: itemNamePlural },
    search: { onChange: onSearchChange, value: searchValue },
    sort: {
      activeDirectionId: activeSortDirectionId,
      activeId: activeSortId,
      onSelect: onSelectSort,
      options: sortOptions,
    },
  } = model;
  const colors = useThemeColors();
  const activeFilters = filters.filter(({ selected }) => selected);
  const activeSort = sortOptions.find(({ id }) => id === activeSortId);
  const activeDirection = activeSort?.directions.find(
    ({ id }) => id === activeSortDirectionId,
  );

  const handleMenuAction = (event: string) => {
    const filter = filters.find(({ id }) => id === event);
    if (filter !== undefined) {
      onToggleFilter?.(filter.id);
      return;
    }

    for (const sort of sortOptions) {
      const direction = sort.directions.find(
        ({ id }) => `sort:${sort.id}:${id}` === event,
      );
      if (direction !== undefined) {
        onSelectSort(sort.id, direction.id);
        return;
      }
    }
  };

  const filterAction = {
    displayInline: true as const,
    id: 'filter-section',
    subactions: filters.map(({ id, label, selected }) => ({
      id,
      state: selected ? 'on' as const : 'off' as const,
      title: label,
    })),
    title: 'Filter',
  };
  const sortAction = {
    displayInline: true as const,
    id: 'sort-section',
    subactions: sortOptions.map((sort) => ({
      id: `sort:${sort.id}`,
      subactions: sort.directions.map((direction) => ({
        id: `sort:${sort.id}:${direction.id}`,
        state: sort.id === activeSortId
          && direction.id === activeSortDirectionId
          ? 'on' as const
          : 'off' as const,
        title: direction.label,
      })),
      title: sort.label,
    })),
    title: 'Sort',
  };
  const controlLabel = filters.length > 0 ? 'Filter and sort' : 'Sort';

  return (
    <>
      {/* Search and menu controls */}
      <View style={styles.controls} testID={`${testIDPrefix}-controls`}>
        {/* Search field */}
        <View
          style={[styles.searchField, { borderColor: colors.border }]}
          testID={`${testIDPrefix}-search-field`}
        >
          <Ionicons color={colors.textSecondary} name="search-outline" size={20} />
          {/* Search input */}
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onSearchChange}
            placeholder={`Search ${itemNamePlural.toLowerCase()}`}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.textPrimary }]}
            testID={`${testIDPrefix}-search-input`}
            value={searchValue}
          />
          {searchValue.length > 0 ? (
            // Clear search button
            <Pressable
              accessibilityLabel={`Clear ${itemName} search`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onSearchChange('')}
              testID={`${testIDPrefix}-search-clear-button`}
            >
              <Ionicons
                color={colors.textSecondary}
                name="close-circle"
                size={18}
                testID={`${testIDPrefix}-search-clear-icon`}
              />
            </Pressable>
          ) : null}
        </View>
        {/* Filter and sort menu */}
        <MenuView
          actions={filters.length > 0 ? [filterAction, sortAction] : [sortAction]}
          onPressAction={({ nativeEvent }) => handleMenuAction(nativeEvent.event)}
          testID={`${testIDPrefix}-filter-sort-menu`}
        >
          {/* Filter and sort button */}
          <View
            accessibilityLabel={`${controlLabel} ${itemNamePlural}, currently ${activeSort?.label}, ${activeDirection?.label}${activeFilters.length > 0 ? ', filters active' : ''}`}
            accessibilityRole="button"
            style={[styles.filterSortButton, { borderColor: colors.border }]}
            testID={`${testIDPrefix}-filter-sort-button`}
          >
            <Ionicons
              color={colors.textPrimary}
              name={activeFilters.length > 0 ? 'options' : 'options-outline'}
              size={20}
              testID={`${testIDPrefix}-filter-sort-icon`}
            />
          </View>
        </MenuView>
      </View>
      {activeFilters.length > 0 ? (
        // Active filters
        <View style={styles.activeFilters} testID={`${testIDPrefix}-active-filters`}>
          {activeFilters.map(({ id, label }) => (
            // Active filter chip
            <Pressable
              accessibilityLabel={`Remove ${label} filter`}
              accessibilityRole="button"
              key={id}
              onPress={() => onToggleFilter?.(id)}
              style={({ pressed }) => [
                styles.activeFilterChip,
                { backgroundColor: colors.control },
                pressed && styles.buttonPressed,
              ]}
              testID={`${testIDPrefix}-active-filter-${id.replaceAll(':', '-')}`}
            >
              <Text style={[styles.activeFilterText, { color: colors.textPrimary }]}>
                {label}
              </Text>
              <Ionicons color={colors.textSecondary} name="close" size={14} />
            </Pressable>
          ))}
          {/* Clear filters button */}
          <Pressable
            accessibilityLabel={`Clear all ${itemName} filters`}
            accessibilityRole="button"
            onPress={onClearFilters}
            style={({ pressed }) => [
              styles.clearFiltersButton,
              pressed && styles.buttonPressed,
            ]}
            testID={`${testIDPrefix}-clear-filters-button`}
          >
            <Text style={[styles.clearFiltersText, { color: colors.accent }]}>Clear all</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  activeFilterChip: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeFilterText: { fontSize: 13, fontWeight: '500' },
  activeFilters: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 24,
    marginTop: 10,
  },
  buttonPressed: { opacity: 0.75 },
  clearFiltersButton: { paddingHorizontal: 4, paddingVertical: 6 },
  clearFiltersText: { fontSize: 13, fontWeight: '600' },
  controls: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 24,
    marginTop: 16,
  },
  filterSortButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  searchField: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12 },
});
