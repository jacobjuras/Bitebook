import { useQuery } from '@tanstack/react-query';
import type { Quantity } from '@bitebook/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type ContentState,
  ContentStateKind,
  ContentStateView,
} from '../../../components/ContentStateView';
import { FavoriteIndicator } from '../../../components/FavoriteIndicator';
import { ItemCard } from '../../../components/ItemCard';
import { ItemCardList } from '../../../components/ItemCardList';
import { SearchFilterSortControls } from '../../../components/SearchFilterSortControls';
import {
  SortDirection,
  FoodSortField,
  foodSortDefinitions,
  foodSortFields,
} from '../../../pantry/foodSorting';
import { foodsQueryOptions, mealsQueryOptions } from '../../../query/pantryQueries';
import { useThemeColors } from '../../../theme/useThemeColors';

type PantrySection = 'foods' | 'meals';

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

function formatQuantity({ amount, unit }: Quantity) {
  const label = unit === 'flOz' ? 'fl oz' : unit === 'item' && amount !== 1 ? 'items' : unit;
  return `${amount} ${label}`;
}

export default function PantryScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [selectedSection, setSelectedSection] = useState<PantrySection>('foods');
  const [foodSearch, setFoodSearch] = useState('');
  const [foodSortField, setFoodSortField] = useState(FoodSortField.Recent);
  const [foodSortDirection, setFoodSortDirection] = useState(
    SortDirection.Descending,
  );
  const [favoritesFilterEnabled, setFavoritesFilterEnabled] = useState(false);
  const [selectedFoodTags, setSelectedFoodTags] = useState<string[]>([]);
  const foodsQuery = useQuery(foodsQueryOptions);
  const mealsQuery = useQuery(mealsQueryOptions);
  const foods = foodsQuery.data ?? [];
  const meals = mealsQuery.data ?? [];
  const hasFoods = foods.length > 0;
  const hasMeals = meals.length > 0;
  const availableFoodTags = [...new Set(
    foods.flatMap(({ tags }) => tags ?? []),
  )].sort();
  const normalizedFoodSearch = foodSearch.trim().toLowerCase();
  const visibleFoods = foods
    .filter(({ name }) => name.toLowerCase().includes(normalizedFoodSearch))
    .filter(({ isFavorite }) => !favoritesFilterEnabled || isFavorite === true)
    .filter(({ tags }) => selectedFoodTags.every((tag) => tags?.includes(tag)))
    .sort((first, second) => {
      const fieldComparison = foodSortDefinitions[foodSortField].compare(
        first,
        second,
      );
      const comparison = fieldComparison || first.name.localeCompare(second.name);
      return foodSortDirection === SortDirection.Ascending
        ? comparison
        : -comparison;
    });
  const isPending = foodsQuery.isPending
    || (selectedSection === 'meals' && mealsQuery.isPending);
  const isError = foodsQuery.isError
    || (selectedSection === 'meals' && mealsQuery.isError);
  const shouldAddFood = selectedSection === 'foods' || !hasFoods;
  const selectedSectionHasItems = selectedSection === 'foods' ? hasFoods : hasMeals;
  const selectedSectionEmptyState = selectedSection === 'foods'
    ? foodEmptyState
    : mealEmptyStates[hasFoods ? 'withFoods' : 'withoutFoods'];
  const actionLabel = selectedSection === 'foods'
    ? hasFoods ? 'Add food' : foodEmptyState.action
    : hasMeals && hasFoods ? 'Add meal' : selectedSectionEmptyState.action;
  const actionTestId = shouldAddFood
    ? 'pantry-add-food-button'
    : 'pantry-add-meal-button';

  const navigateToAddItem = () => {
    if (shouldAddFood) {
      router.push('/pantry/food/new');
      return;
    }
    router.push('/pantry/meal/new');
  };

  const toggleFoodTag = (tag: string) => {
    setSelectedFoodTags((selectedTags) => selectedTags.includes(tag)
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
    noResultsState: selectedSection === 'foods'
      && hasFoods
      && visibleFoods.length === 0
      ? foodNoResultsState
      : undefined,
  });

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
      {/* Pantry section control */}
      <View style={[styles.segmentedControl, { backgroundColor: colors.control }]}>
        {(['foods', 'meals'] as const).map((value) => {
          const selected = selectedSection === value;
          return (
            // Pantry section tab
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={value}
              onPress={() => setSelectedSection(value)}
              testID={`pantry-${value}-tab`}
              style={[
                styles.segment,
                selected && { backgroundColor: colors.controlSelected },
              ]}
            >
              {/* Pantry section label */}
              <Text
                style={[
                  styles.segmentText,
                  { color: selected ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {value === 'foods' ? 'Foods' : 'Meals'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selectedSection === 'foods' && hasFoods && !isPending && !isError ? (
        <SearchFilterSortControls
          activeSortDirectionId={foodSortDirection}
          activeSortId={foodSortField}
          filters={[
            {
              id: 'favorites',
              label: 'Favorites',
              selected: favoritesFilterEnabled,
            },
            ...availableFoodTags.map((tag) => ({
              id: `tag:${tag}`,
              label: tag,
              selected: selectedFoodTags.includes(tag),
            })),
          ]}
          itemName="Food"
          itemNamePlural="Foods"
          onClearFilters={() => {
            setFavoritesFilterEnabled(false);
            setSelectedFoodTags([]);
          }}
          onSearchChange={setFoodSearch}
          onSelectSort={(field, direction) => {
            setFoodSortField(field);
            setFoodSortDirection(direction);
          }}
          onToggleFilter={(filter) => {
            if (filter === 'favorites') {
              setFavoritesFilterEnabled((enabled) => !enabled);
              return;
            }
            toggleFoodTag(filter.slice(4));
          }}
          searchValue={foodSearch}
          sortOptions={foodSortFields.map((field) => ({
            directions: foodSortDefinitions[field].directionOrder.map(
              (direction) => ({
                id: direction,
                label: foodSortDefinitions[field].directionLabels[direction],
              }),
            ),
            id: field,
            label: foodSortDefinitions[field].label,
          }))}
          testIDPrefix="pantry-food"
        />
      ) : null}
      {contentState ? (
        <ContentStateView state={contentState} testIDPrefix="pantry" />
      ) : selectedSection === 'foods' ? (
        // Food card list
        <ItemCardList
          items={visibleFoods}
          keyExtractor={({ id }) => id}
          renderItem={(food, testIDPrefix) => (
            // Food card
            <ItemCard
              accessory={food.isFavorite === true ? (
                <FavoriteIndicator testIDPrefix={testIDPrefix} />
              ) : undefined}
              testIDPrefix={testIDPrefix}
              title={food.name}
            >
              {/* Calories per serving */}
              <Text
                style={[styles.foodDetail, { color: colors.textSecondary }]}
                testID={`${testIDPrefix}-calories`}
              >
                {food.nutritionFacts.caloriesKcal} kcal per serving
              </Text>
              {/* Serving size */}
              <Text
                style={[styles.foodDetail, { color: colors.textSecondary }]}
                testID={`${testIDPrefix}-serving-size`}
              >
                Serving: {formatQuantity(food.servingSize)}
              </Text>
              {food.tags && food.tags.length > 0 ? (
                <View style={styles.foodTags} testID={`${testIDPrefix}-tags`}>
                  {food.tags.map((tag) => (
                    <Text
                      key={tag}
                      style={[
                        styles.foodTag,
                        { backgroundColor: colors.control, color: colors.textSecondary },
                      ]}
                      testID={`${testIDPrefix}-tag-${tag}`}
                    >
                      {tag}
                    </Text>
                  ))}
                </View>
              ) : null}
            </ItemCard>
          )}
          testIDPrefix="pantry-food"
          topPadding={16}
        />
      ) : (
        // Meal card list
        <ItemCardList
          items={meals}
          keyExtractor={({ id }) => id}
          renderItem={(meal, testIDPrefix) => (
            // Meal card
            <ItemCard testIDPrefix={testIDPrefix} title={meal.name}>
              {/* Meal ingredient count */}
              <Text
                style={[styles.mealDetail, { color: colors.textSecondary }]}
                testID={`${testIDPrefix}-ingredient-count`}
              >
                {meal.ingredients.length}{' '}
                {meal.ingredients.length === 1 ? 'ingredient' : 'ingredients'}
              </Text>
            </ItemCard>
          )}
          testIDPrefix="pantry-meal"
        />
      )}
      {!isPending && !isError ? (
        // Pantry primary action
        <Pressable
          accessibilityRole="button"
          onPress={navigateToAddItem}
          testID={actionTestId}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.accent },
            pressed && styles.buttonPressed,
          ]}
        >
          {/* Pantry primary-action label */}
          <Text style={[styles.buttonText, { color: colors.onAccent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', borderRadius: 12, margin: 24, padding: 14 },
  buttonPressed: { opacity: 0.75 },
  buttonText: { fontSize: 17, fontWeight: '600' },
  foodDetail: { fontSize: 14 },
  foodTag: { borderRadius: 8, fontSize: 12, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  foodTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heading: { fontSize: 34, fontWeight: '700', margin: 24, marginBottom: 18 },
  mealDetail: { fontSize: 14 },
  screen: { flex: 1 },
  segment: { alignItems: 'center', borderRadius: 8, flex: 1, padding: 8 },
  segmentedControl: { borderRadius: 10, flexDirection: 'row', marginHorizontal: 24, padding: 3 },
  segmentText: { fontSize: 15, fontWeight: '600' },
});
