import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Text, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { foodEmptyState, foodNoResultsState } from '../../../constants/food-constants';
import {
  ItemSortField,
  SortDirection,
  itemSortOptions,
} from '../../../constants/sorting-constants';
import { mealEmptyStates } from '../../../constants/meal-constants';
import { PantrySection } from '../../../constants/pantry-constants';
import { ItemListView } from '../../../components/ItemListView/ItemListView';
import { PantrySectionControl } from '../../../components/PantrySectionControl/PantrySectionControl';
import { SearchFilterSortControls } from '../../../components/SearchFilterSortControls/SearchFilterSortControls';
import type { SearchFilterSortModel } from '../../../models/searchFilterSort';
import { foodsQueryOptions, mealsQueryOptions } from '../../../query/pantryQueries';
import { useThemeColors } from '../../../theme/useThemeColors';
import { filterItems, getAvailableTags } from '../../../utils/searchFilterSort/filtering';
import { sortItems } from '../../../utils/searchFilterSort/sorting';
import { getContentState } from '../../../utils/pantry/contentState';
import { getFoodCardItem, getSortableFood } from '../../../utils/pantry/food';
import { getMealCardItem } from '../../../utils/pantry/meal';
import { styles } from './styles';

export default function PantryScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [selectedSection, setSelectedSection] = useState<PantrySection>(PantrySection.Foods);
  const [foodSearch, setFoodSearch] = useState('');
  const [itemSortField, setItemSortField] = useState(ItemSortField.Recent);
  const [itemSortDirection, setItemSortDirection] = useState(
    SortDirection.Descending,
  );
  const [favoritesFilterEnabled, setFavoritesFilterEnabled] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const foodsQuery = useQuery(foodsQueryOptions);
  const mealsQuery = useQuery(mealsQueryOptions);
  const foods = foodsQuery.data ?? [];
  const meals = mealsQuery.data ?? [];
  const hasFoods = foods.length > 0;
  const hasMeals = meals.length > 0;
  const availableTags = getAvailableTags(foods);
  const visibleFoods = sortItems(
    filterItems(foods, {
      favorites: favoritesFilterEnabled,
      search: foodSearch,
      tags: selectedTags,
    }),
    getSortableFood,
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
        items: meals.map(getMealCardItem),
        itemTestIDPrefix: 'pantry-meal',
        topPadding: undefined,
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
    setFavoritesFilterEnabled(false);
    setSelectedTags([]);
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
    if (filter === 'favorites') {
      setFavoritesFilterEnabled((enabled) => !enabled);
      return;
    }

    const tag = filter.slice(4);
    setSelectedTags((selectedTags) => selectedTags.includes(tag)
      ? selectedTags.filter((selectedTag) => selectedTag !== tag)
      : [...selectedTags, tag]);
  };

  const retryLoading = () => {
    if (foodsQuery.isError) void foodsQuery.refetch();
    if (mealsQuery.isError) void mealsQuery.refetch();
  };

  const contentState = getContentState({
    emptyState: selectedSectionHasItems ? undefined : selectedSectionEmptyState,
    errorState: isError
      ? { message: 'Unable to load your pantry', onRetry: retryLoading }
      : undefined,
    isPending,
    noResultsState: selectedSection === PantrySection.Foods
      && hasFoods
      && visibleFoods.length === 0
      ? foodNoResultsState
      : undefined,
  });

  const itemControlsModel = {
    filters: {
      onClear: clearFilters,
      onToggle: toggleFilter,
      options: [
        {
          id: 'favorites' as const,
          label: 'Favorites',
          selected: favoritesFilterEnabled,
        },
        ...availableTags.map((tag) => ({
          id: `tag:${tag}` as const,
          label: tag,
          selected: selectedTags.includes(tag),
        })),
      ],
    },
    item: { name: 'Food', pluralName: 'Foods' },
    search: { onChange: setFoodSearch, value: foodSearch },
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
  const controls = selectedSection === PantrySection.Foods
    && hasFoods
    && !isPending
    && !isError ? (
      <SearchFilterSortControls
        model={itemControlsModel}
        testIDPrefix="pantry-food"
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
