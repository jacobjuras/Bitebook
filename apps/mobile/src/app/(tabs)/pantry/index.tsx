import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Text, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ItemListView,
  PantrySectionControl,
  SearchFilterSortControls,
} from '~/components';
import {
  ItemSortField,
  PantrySection,
  SortDirection,
  foodEmptyState,
  foodNoResultsState,
  itemSortOptions,
  mealEmptyStates,
  mealNoResultsState,
} from '~/constants';
import type { SearchFilterSortModel } from '~/models';
import { useThemeColors } from '~/theme';
import {
  filterItems,
  getAvailableTags,
  getContentState,
  getFoodCardItem,
  getMealCardItem,
  getSortableFood,
  getSortableMeal,
  sortItems,
} from '~/utils';

import { foodsQueryOptions, mealsQueryOptions } from '../../../query/pantryQueries';
import { styles } from '../../../styles/pantry';

export default function PantryScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [selectedSection, setSelectedSection] = useState<PantrySection>(PantrySection.Foods);
  const [foodSearch, setFoodSearch] = useState('');
  const [mealSearch, setMealSearch] = useState('');
  const [itemSortField, setItemSortField] = useState(ItemSortField.Recent);
  const [itemSortDirection, setItemSortDirection] = useState(
    SortDirection.Descending,
  );
  const [filtersBySection, setFiltersBySection] = useState<
    Record<PantrySection, { favorites: boolean; tags: string[] }>
  >({
    [PantrySection.Foods]: { favorites: false, tags: [] },
    [PantrySection.Meals]: { favorites: false, tags: [] },
  });
  const foodsQuery = useQuery(foodsQueryOptions);
  const mealsQuery = useQuery(mealsQueryOptions);
  const foods = foodsQuery.data ?? [];
  const meals = mealsQuery.data ?? [];
  const foodsById = new Map(foods.map((food) => [food.id, food]));
  const foodFilters = filtersBySection[PantrySection.Foods];
  const mealFilters = filtersBySection[PantrySection.Meals];
  const activeFilters = filtersBySection[selectedSection];
  const hasFoods = foods.length > 0;
  const hasMeals = meals.length > 0;
  const availableTags = getAvailableTags(
    selectedSection === PantrySection.Foods ? foods : meals,
  );
  const visibleFoods = sortItems(
    filterItems(foods, {
      ...foodFilters,
      search: foodSearch,
    }),
    getSortableFood,
    itemSortField,
    itemSortDirection,
  );
  const visibleMeals = sortItems(
    filterItems(meals, {
      ...mealFilters,
      search: mealSearch,
    }),
    (meal) => getSortableMeal(meal, foodsById),
    itemSortField,
    itemSortDirection,
  );
  const activeItemListProps = selectedSection === PantrySection.Foods
    ? {
        items: visibleFoods.map(getFoodCardItem),
        itemTestIDPrefix: 'pantry-food',
        topPadding: 16,
      }
    : {
        items: visibleMeals.map(getMealCardItem),
        itemTestIDPrefix: 'pantry-meal',
        topPadding: 16,
      };
  const isPending = foodsQuery.isPending
    || (selectedSection === PantrySection.Meals && mealsQuery.isPending);
  const isError = foodsQuery.isError
    || (selectedSection === PantrySection.Meals && mealsQuery.isError);
  const shouldAddFood = selectedSection === PantrySection.Foods || !hasFoods;
  const selectedSectionHasItems = selectedSection === PantrySection.Foods ? hasFoods : hasMeals;
  const selectedSectionEmptyState = selectedSection === PantrySection.Foods
    ? foodEmptyState
    : mealEmptyStates[hasFoods ? 'withFoods' : 'withoutFoods'];
  const actionLabel = selectedSection === PantrySection.Foods
    ? hasFoods ? 'Add food' : foodEmptyState.action
    : hasMeals && hasFoods ? 'Add meal' : selectedSectionEmptyState.action;

  const navigateToAddItem = () => {
    if (shouldAddFood) {
      router.push('/pantry/food/newFood');
      return;
    }
    router.push('/pantry/meal/newMeal');
  };

  const clearFilters = () => {
    setFiltersBySection((filters) => ({
      ...filters,
      [selectedSection]: { favorites: false, tags: [] },
    }));
  };

  const selectItemSort = (
    field: ItemSortField,
    direction: SortDirection,
  ) => {
    setItemSortField(field);
    setItemSortDirection(direction);
  };

  const toggleFilter = (
    filter: 'favorites' | `tag:${string}`,
  ) => {
    setFiltersBySection((filters) => {
      const currentFilters = filters[selectedSection];
      const updatedFilters = filter === 'favorites'
        ? { ...currentFilters, favorites: !currentFilters.favorites }
        : {
            ...currentFilters,
            tags: currentFilters.tags.includes(filter.slice(4))
              ? currentFilters.tags.filter((tag) => tag !== filter.slice(4))
              : [...currentFilters.tags, filter.slice(4)],
          };

      return { ...filters, [selectedSection]: updatedFilters };
    });
  };

  const retryLoading = () => {
    if (foodsQuery.isError) void foodsQuery.refetch();
    if (mealsQuery.isError) void mealsQuery.refetch();
  };

  const noResultsState = selectedSection === PantrySection.Foods
    ? hasFoods && visibleFoods.length === 0 ? foodNoResultsState : undefined
    : hasMeals && visibleMeals.length === 0 ? mealNoResultsState : undefined;
  const contentState = getContentState({
    emptyState: selectedSectionHasItems ? undefined : selectedSectionEmptyState,
    errorState: isError
      ? { message: 'Unable to load your pantry', onRetry: retryLoading }
      : undefined,
    isPending,
    noResultsState,
  });

  const itemControlsModel = {
    filters: {
      onClear: clearFilters,
      onToggle: toggleFilter,
      options: [
        {
          id: 'favorites' as const,
          label: 'Favorites',
          selected: activeFilters.favorites,
        },
        ...availableTags.map((tag) => ({
          id: `tag:${tag}` as const,
          label: tag,
          selected: activeFilters.tags.includes(tag),
        })),
      ],
    },
    item: selectedSection === PantrySection.Foods
      ? { name: 'Food', pluralName: 'Foods' }
      : { name: 'Meal', pluralName: 'Meals' },
    search: selectedSection === PantrySection.Foods
      ? { onChange: setFoodSearch, value: foodSearch }
      : { onChange: setMealSearch, value: mealSearch },
    sort: {
      activeDirectionId: itemSortDirection,
      activeId: itemSortField,
      onSelect: selectItemSort,
      options: itemSortOptions,
    },
  } satisfies SearchFilterSortModel<
    'favorites' | `tag:${string}`,
    ItemSortField,
    SortDirection
  >;
  const controls = selectedSectionHasItems && !isPending && !isError ? (
    <SearchFilterSortControls
      model={itemControlsModel}
      testIDPrefix={selectedSection === PantrySection.Foods
        ? 'pantry-food'
        : 'pantry-meal'}
    />
  ) : undefined;
  const action = !isPending && !isError
    ? {
        label: actionLabel,
        onPress: navigateToAddItem,
        testIDPrefix: shouldAddFood ? 'pantry-food' : 'pantry-meal',
      }
    : undefined;

  // Pantry screen
  return (
    <TouchableWithoutFeedback
      accessible={false}
      onPress={Keyboard.dismiss}
      testID="pantry-dismiss-keyboard"
    >
      <SafeAreaView
        edges={['top']}
        style={[styles.screen, { backgroundColor: colors.background }]}
      >
      {/* Screen title */}
      <Text style={[styles.heading, { color: colors.textPrimary }]}>Pantry</Text>
      <PantrySectionControl
        onSelect={setSelectedSection}
        selectedSection={selectedSection}
        testIDPrefix="pantry"
      />
      <ItemListView
        {...activeItemListProps}
        action={action}
        contentState={contentState}
        controls={controls}
        testIDPrefix="pantry"
      />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
