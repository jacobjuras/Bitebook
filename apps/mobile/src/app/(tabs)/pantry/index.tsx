import { useQuery } from '@tanstack/react-query';
import type { Food, Meal } from '@bitebook/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type ContentState,
  ContentStateKind,
} from '../../../components/ContentStateView';
import { FavoriteIndicator } from '../../../components/FavoriteIndicator';
import type { ItemCardModel } from '../../../components/ItemCard';
import { ItemListView } from '../../../components/ItemListView';
import {
  SearchFilterSortControls,
  type SearchFilterSortModel,
} from '../../../components/SearchFilterSortControls';
import {
  PantrySection,
  PantrySectionControl,
} from '../../../components/PantrySectionControl';
import { filterItems, getAvailableTags } from '../../../pantry/itemFiltering';
import {
  ItemSortField,
  SortDirection,
  itemSortDefinitions,
  itemSortFields,
  type SortableItem,
} from '../../../pantry/itemSorting';
import { foodsQueryOptions, mealsQueryOptions } from '../../../query/pantryQueries';
import { useThemeColors } from '../../../theme/useThemeColors';

type EmptyState = {
  action: string;
  description: string;
  icon: 'nutrition-outline' | 'restaurant-outline';
  title: string;
};

const foodEmptyState: EmptyState = {
  action: 'Add first food',
  description: 'Add a food to begin tracking what you have',
  icon: 'nutrition-outline',
  title: 'Your pantry is empty',
};

const foodNoResultsState = {
  description: 'Try a different search or filter',
  title: 'No foods found',
};

const mealEmptyStates: Record<'withFoods' | 'withoutFoods', EmptyState> = {
  withoutFoods: {
    action: 'Add first food',
    description: 'Saved meals are made from foods in your pantry',
    icon: 'restaurant-outline',
    title: 'Add food before making a meal',
  },
  withFoods: {
    action: 'Create first meal',
    description: 'Combine foods you eat together into a reusable meal',
    icon: 'restaurant-outline',
    title: 'Create your first meal',
  },
};

const itemSortOptions = itemSortFields.map((field) => ({
  directions: itemSortDefinitions[field].directionOrder.map((direction) => ({
    id: direction,
    label: itemSortDefinitions[field].directionLabels[direction],
  })),
  id: field,
  label: itemSortDefinitions[field].label,
}));

type ContentStateOptions = {
  emptyState?: EmptyState;
  errorState?: { message: string; onRetry: () => void };
  isPending: boolean;
  noResultsState?: { description: string; title: string };
};

function getContentState({
  emptyState,
  errorState,
  isPending,
  noResultsState,
}: ContentStateOptions): ContentState | null {
  if (isPending) return { kind: ContentStateKind.Loading };
  if (errorState) return { kind: ContentStateKind.Error, ...errorState };
  if (noResultsState) {
    return { kind: ContentStateKind.NoResults, ...noResultsState };
  }
  if (emptyState) {
    return {
      description: emptyState.description,
      icon: emptyState.icon,
      kind: ContentStateKind.Empty,
      title: emptyState.title,
    };
  }
  return null;
}

function getFoodCardDetails(food: Food) {
  const summary = [`${food.nutritionFacts.caloriesKcal} kcal`];
  if (food.nutritionFacts.proteinG !== undefined) {
    summary.push(`${food.nutritionFacts.proteinG} g protein`);
  }

  return [{ id: 'summary', text: summary.join(' · ') }];
}

function getSortableFood(food: Food): SortableItem {
  return {
    caloriesKcal: food.nutritionFacts.caloriesKcal,
    name: food.name,
    recentAt: food.lastLoggedAt ?? food.createdAt,
  };
}

function renderFavoriteIndicator(testIDPrefix: string) {
  return (
    // Favorite indicator
    <FavoriteIndicator testIDPrefix={testIDPrefix} />
  );
}

function getFoodCardItem(food: Food): ItemCardModel {
  return {
    accessory: food.isFavorite === true ? renderFavoriteIndicator : undefined,
    chips: food.tags?.map((tag) => ({ id: tag, label: tag })),
    details: getFoodCardDetails(food),
    id: food.id,
    title: food.name,
  };
}

function getMealCardItem(meal: Meal): ItemCardModel {
  return {
    details: [
      {
        id: 'ingredient-count',
        text: `${meal.ingredients.length} ${
          meal.ingredients.length === 1 ? 'ingredient' : 'ingredients'
        }`,
      },
    ],
    id: meal.id,
    title: meal.name,
  };
}

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
  const visibleFoods = filterItems(foods, {
    favorites: favoritesFilterEnabled,
    search: foodSearch,
    tags: selectedTags,
  }).sort((first, second) => {
      const fieldComparison = itemSortDefinitions[itemSortField].compare(
        getSortableFood(first),
        getSortableFood(second),
      );
      const comparison = fieldComparison || first.name.localeCompare(second.name);
      return itemSortDirection === SortDirection.Ascending
        ? comparison
        : -comparison;
    });
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
      router.push('/pantry/food/new');
      return;
    }
    router.push('/pantry/meal/new');
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

const styles = StyleSheet.create({
  heading: { fontSize: 34, fontWeight: '700', margin: 24, marginBottom: 18 },
  screen: { flex: 1 },
});
