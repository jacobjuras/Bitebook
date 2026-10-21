import Ionicons from '@expo/vector-icons/Ionicons';
import { MenuView } from '@expo/ui/community/menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Food, Meal, Quantity } from '@bitebook/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { updateFood } from '../../../api/foods';
import {
  FoodSortDirection,
  FoodSortField,
  foodSortDefinitions,
  foodSortFields,
  parseFoodSortSelection,
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

function formatQuantity({ amount, unit }: Quantity) {
  const label = unit === 'flOz' ? 'fl oz' : unit === 'item' && amount !== 1 ? 'items' : unit;
  return `${amount} ${label}`;
}

export default function PantryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const colors = useThemeColors();
  const [selectedSection, setSelectedSection] = useState<PantrySection>('foods');
  const [foodSearch, setFoodSearch] = useState('');
  const [foodSortField, setFoodSortField] = useState(FoodSortField.Recent);
  const [foodSortDirection, setFoodSortDirection] = useState(
    FoodSortDirection.Descending,
  );
  const [favoritesFilterEnabled, setFavoritesFilterEnabled] = useState(false);
  const [selectedFoodTags, setSelectedFoodTags] = useState<string[]>([]);
  const foodsQuery = useQuery(foodsQueryOptions);
  const mealsQuery = useQuery(mealsQueryOptions);
  const favoriteMutation = useMutation({
    mutationFn: ({ foodId, isFavorite }: {
      foodId: string;
      isFavorite: boolean;
    }) => updateFood(foodId, { isFavorite }),
    onSuccess: (updatedFood) => {
      queryClient.setQueryData<Food[]>(
        foodsQueryOptions.queryKey,
        (currentFoods) => currentFoods?.map((food) =>
          food.id === updatedFood.id ? updatedFood : food),
      );
    },
  });
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
      return foodSortDirection === FoodSortDirection.Ascending
        ? comparison
        : -comparison;
    });
  const isPending = foodsQuery.isPending
    || (selectedSection === 'meals' && mealsQuery.isPending);
  const isError = foodsQuery.isError
    || (selectedSection === 'meals' && mealsQuery.isError);
  const shouldAddFood = selectedSection === 'foods' || !hasFoods;
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
        <>
          {/* Food list controls */}
          <View style={styles.foodControls} testID="pantry-food-controls">
          {/* Food search field */}
          <View
            style={[styles.searchField, { borderColor: colors.border }]}
            testID="pantry-food-search-field"
          >
            <Ionicons color={colors.textSecondary} name="search-outline" size={20} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setFoodSearch}
              placeholder="Search foods"
              returnKeyType="search"
              style={[styles.searchInput, { color: colors.textPrimary }]}
              testID="pantry-food-search-input"
              value={foodSearch}
            />
            {foodSearch.length > 0 ? (
              <Pressable
                accessibilityLabel="Clear Food search"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setFoodSearch('')}
                testID="pantry-food-search-clear-button"
              >
                <Ionicons
                  color={colors.textSecondary}
                  name="close-circle"
                  size={18}
                  testID="pantry-food-search-clear-icon"
                />
              </Pressable>
            ) : null}
          </View>
          <MenuView
            actions={[
              {
                displayInline: true,
                id: 'filter-section',
                subactions: [
                  {
                    id: 'favorites',
                    state: favoritesFilterEnabled ? 'on' : 'off',
                    title: 'Favorites',
                  },
                  ...availableFoodTags.map((tag) => ({
                    id: `tag:${tag}`,
                    state: selectedFoodTags.includes(tag) ? 'on' as const : 'off' as const,
                    title: tag,
                  })),
                ],
                title: 'Filter',
              },
              {
                displayInline: true,
                id: 'sort-section',
                subactions: foodSortFields.map((field) => ({
                  id: `sort:${field}`,
                  subactions: foodSortDefinitions[field].directionOrder.map(
                    (direction) => ({
                      id: `sort:${field}:${direction}`,
                      state: foodSortField === field
                        && foodSortDirection === direction
                        ? 'on' as const
                        : 'off' as const,
                      title: foodSortDefinitions[field]
                        .directionLabels[direction],
                    }),
                  ),
                  title: foodSortDefinitions[field].label,
                })),
                title: 'Sort',
              },
            ]}
            onPressAction={({ nativeEvent }) => {
              const sortSelection = parseFoodSortSelection(nativeEvent.event);
              if (nativeEvent.event === 'favorites') {
                setFavoritesFilterEnabled((enabled) => !enabled);
              } else if (nativeEvent.event.startsWith('tag:')) {
                toggleFoodTag(nativeEvent.event.slice(4));
              } else if (sortSelection !== undefined) {
                setFoodSortField(sortSelection.field);
                setFoodSortDirection(sortSelection.direction);
              }
            }}
            testID="pantry-food-filter-sort-menu"
          >
            <View
              accessibilityLabel={`Filter and sort Foods, currently ${foodSortDefinitions[foodSortField].label}, ${foodSortDefinitions[foodSortField].directionLabels[foodSortDirection]}${favoritesFilterEnabled || selectedFoodTags.length > 0 ? ', filters active' : ''}`}
              accessibilityRole="button"
              style={[styles.filterSortButton, { borderColor: colors.border }]}
              testID="pantry-food-filter-sort-button"
            >
              <Ionicons
                color={colors.textPrimary}
                name={favoritesFilterEnabled || selectedFoodTags.length > 0
                  ? 'options'
                  : 'options-outline'}
                size={20}
                testID="pantry-food-filter-sort-icon"
              />
            </View>
          </MenuView>
        </View>
          {favoritesFilterEnabled || selectedFoodTags.length > 0 ? (
            <View style={styles.activeFilters} testID="pantry-food-active-filters">
              {favoritesFilterEnabled ? (
                <Pressable
                  accessibilityLabel="Remove Favorites filter"
                  accessibilityRole="button"
                  onPress={() => setFavoritesFilterEnabled(false)}
                  style={({ pressed }) => [
                    styles.activeFilterChip,
                    { backgroundColor: colors.control },
                    pressed && styles.buttonPressed,
                  ]}
                  testID="pantry-food-active-filter-favorites"
                >
                  <Text style={[styles.activeFilterText, { color: colors.textPrimary }]}>Favorites</Text>
                  <Ionicons color={colors.textSecondary} name="close" size={14} />
                </Pressable>
              ) : null}
              {selectedFoodTags.map((tag) => (
                <Pressable
                  accessibilityLabel={`Remove ${tag} filter`}
                  accessibilityRole="button"
                  key={tag}
                  onPress={() => toggleFoodTag(tag)}
                  style={({ pressed }) => [
                    styles.activeFilterChip,
                    { backgroundColor: colors.control },
                    pressed && styles.buttonPressed,
                  ]}
                  testID={`pantry-food-active-filter-tag-${tag}`}
                >
                  <Text style={[styles.activeFilterText, { color: colors.textPrimary }]}>{tag}</Text>
                  <Ionicons color={colors.textSecondary} name="close" size={14} />
                </Pressable>
              ))}
              <Pressable
                accessibilityLabel="Clear all Food filters"
                accessibilityRole="button"
                onPress={() => {
                  setFavoritesFilterEnabled(false);
                  setSelectedFoodTags([]);
                }}
                style={({ pressed }) => [
                  styles.clearFiltersButton,
                  pressed && styles.buttonPressed,
                ]}
                testID="pantry-food-clear-filters-button"
              >
                <Text style={[styles.clearFiltersText, { color: colors.accent }]}>Clear all</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}
      {isPending ? (
        // Pantry loading state
        <ActivityIndicator
          color={colors.accent}
          style={styles.centeredState}
          testID="pantry-loading-indicator"
        />
      ) : isError ? (
        // Pantry error state
        <View style={styles.centeredState} testID="pantry-error">
          {/* Pantry error message */}
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            testID="pantry-error-message"
          >Unable to load your pantry</Text>
          {/* Pantry retry button */}
          <Pressable
            accessibilityRole="button"
            onPress={retryLoading}
            testID="pantry-retry-load-button"
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: colors.control },
              pressed && styles.buttonPressed,
            ]}
          >
            {/* Pantry retry label */}
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Try again</Text>
          </Pressable>
        </View>
      ) : selectedSection === 'foods' && hasFoods && visibleFoods.length === 0 ? (
        // Food search empty state
        <View style={styles.emptyState} testID="pantry-food-search-empty">
          {/* Food search empty title */}
          <Text
            style={[styles.emptyTitle, { color: colors.textPrimary }]}
            testID="pantry-food-search-empty-title"
          >No foods found</Text>
          {/* Food search empty description */}
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            testID="pantry-food-search-empty-description"
          >Try a different search or filter</Text>
        </View>
      ) : selectedSection === 'foods' && hasFoods ? (
        // Food card list
        <ScrollView contentContainerStyle={styles.foodList} testID="pantry-food-list">
          {visibleFoods.map((food: Food) => (
            // Food card
            <View
              key={food.id}
              style={[styles.foodCard, { borderColor: colors.border }]}
              testID={`pantry-food-${food.id}`}
            >
              <View style={styles.foodTitleRow}>
                <Text
                  style={[styles.foodName, { color: colors.textPrimary }]}
                  testID={`pantry-food-${food.id}-name`}
                >{food.name}</Text>
                <Pressable
                  accessibilityLabel={food.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  accessibilityRole="button"
                  accessibilityState={{ selected: food.isFavorite === true }}
                  onPress={() => favoriteMutation.mutate({
                    foodId: food.id,
                    isFavorite: food.isFavorite !== true,
                  })}
                  testID={`pantry-food-${food.id}-favorite-button`}
                >
                  <Ionicons
                    color={colors.accent}
                    name={food.isFavorite ? 'star' : 'star-outline'}
                    size={22}
                    testID={`pantry-food-${food.id}-favorite-icon`}
                  />
                </Pressable>
              </View>
              {/* Calories per serving */}
              <Text
                style={[styles.foodDetail, { color: colors.textSecondary }]}
                testID={`pantry-food-${food.id}-calories`}
              >{food.nutritionFacts.caloriesKcal} kcal per serving</Text>
              {/* Serving size */}
              <Text
                style={[styles.foodDetail, { color: colors.textSecondary }]}
                testID={`pantry-food-${food.id}-serving-size`}
              >Serving: {formatQuantity(food.servingSize)}</Text>
              {food.tags && food.tags.length > 0 ? (
                <View style={styles.foodTags} testID={`pantry-food-${food.id}-tags`}>
                  {food.tags.map((tag) => (
                    <Text
                      key={tag}
                      style={[
                        styles.foodTag,
                        { backgroundColor: colors.control, color: colors.textSecondary },
                      ]}
                      testID={`pantry-food-${food.id}-tag-${tag}`}
                    >{tag}</Text>
                  ))}
                </View>
              ) : null}
              {favoriteMutation.isError
                && favoriteMutation.variables?.foodId === food.id ? (
                  <Text
                    style={[styles.favoriteError, { color: colors.danger }]}
                    testID={`pantry-food-${food.id}-favorite-error`}
                  >Unable to update favorite</Text>
                ) : null}
            </View>
          ))}
        </ScrollView>
      ) : selectedSection === 'meals' && hasMeals ? (
        // Meal card list
        <ScrollView contentContainerStyle={styles.mealList} testID="pantry-meal-list">
          {meals.map((meal: Meal) => (
            // Meal card
            <View
              key={meal.id}
              style={[styles.mealCard, { borderColor: colors.border }]}
              testID={`pantry-meal-${meal.id}`}
            >
              {/* Meal name */}
              <Text
                style={[styles.mealName, { color: colors.textPrimary }]}
                testID={`pantry-meal-${meal.id}-name`}
              >{meal.name}</Text>
              {/* Meal ingredient count */}
              <Text
                style={[styles.mealDetail, { color: colors.textSecondary }]}
                testID={`pantry-meal-${meal.id}-ingredient-count`}
              >
                {meal.ingredients.length}{' '}
                {meal.ingredients.length === 1 ? 'ingredient' : 'ingredients'}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        // Pantry empty state
        <View style={styles.emptyState} testID="pantry-empty-state">
          {/* Empty-state icon */}
          <View style={[styles.iconCircle, { backgroundColor: colors.accentSubtle }]}>
            <Ionicons color={colors.accent} name={selectedSectionEmptyState.icon} size={30} />
          </View>
          {/* Empty-state title */}
          <Text
            style={[styles.emptyTitle, { color: colors.textPrimary }]}
            testID="pantry-empty-state-title"
          >{selectedSectionEmptyState.title}</Text>
          {/* Empty-state description */}
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            testID="pantry-empty-state-description"
          >{selectedSectionEmptyState.description}</Text>
        </View>
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
  clearFiltersButton: { paddingHorizontal: 4, paddingVertical: 6 },
  clearFiltersText: { fontSize: 13, fontWeight: '600' },
  button: { alignItems: 'center', borderRadius: 12, margin: 24, padding: 14 },
  buttonPressed: { opacity: 0.75 },
  buttonText: { fontSize: 17, fontWeight: '600' },
  centeredState: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center' },
  description: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  emptyState: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  favoriteError: { fontSize: 13 },
  filterSortButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  foodCard: { borderRadius: 12, borderWidth: 1, gap: 8, padding: 14 },
  foodControls: { flexDirection: 'row', gap: 10, marginHorizontal: 24, marginTop: 16 },
  foodDetail: { fontSize: 14 },
  foodList: { gap: 10, paddingBottom: 24, paddingHorizontal: 24, paddingTop: 16 },
  foodName: { flex: 1, fontSize: 17, fontWeight: '600' },
  foodTag: { borderRadius: 8, fontSize: 12, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4 },
  foodTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  foodTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  heading: { fontSize: 34, fontWeight: '700', margin: 24, marginBottom: 18 },
  iconCircle: { alignItems: 'center', borderRadius: 30, height: 60, justifyContent: 'center', width: 60 },
  mealCard: { borderRadius: 12, borderWidth: 1, gap: 8, padding: 14 },
  mealDetail: { fontSize: 14 },
  mealList: { gap: 10, padding: 24 },
  mealName: { fontSize: 17, fontWeight: '600' },
  retryButton: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  screen: { flex: 1 },
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
  segment: { alignItems: 'center', borderRadius: 8, flex: 1, padding: 8 },
  segmentedControl: { borderRadius: 10, flexDirection: 'row', marginHorizontal: 24, padding: 3 },
  segmentText: { fontSize: 15, fontWeight: '600' },
});
