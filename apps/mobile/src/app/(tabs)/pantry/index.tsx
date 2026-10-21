import Ionicons from '@expo/vector-icons/Ionicons';
import { MenuView } from '@expo/ui/community/menu';
import { useQuery } from '@tanstack/react-query';
import type { Food, Meal, Quantity } from '@bitebook/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { foodsQueryOptions, mealsQueryOptions } from '../../../query/pantryQueries';
import { useThemeColors } from '../../../theme/useThemeColors';

type PantrySection = 'foods' | 'meals';
type FoodSortField = 'name' | 'calories';
type FoodSortDirection = 'ascending' | 'descending';

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
  const colors = useThemeColors();
  const [selectedSection, setSelectedSection] = useState<PantrySection>('foods');
  const [foodSearch, setFoodSearch] = useState('');
  const [foodSortField, setFoodSortField] = useState<FoodSortField>('name');
  const [foodSortDirection, setFoodSortDirection] =
    useState<FoodSortDirection>('ascending');
  const foodsQuery = useQuery(foodsQueryOptions);
  const mealsQuery = useQuery(mealsQueryOptions);
  const foods = foodsQuery.data ?? [];
  const meals = mealsQuery.data ?? [];
  const hasFoods = foods.length > 0;
  const hasMeals = meals.length > 0;
  const normalizedFoodSearch = foodSearch.trim().toLowerCase();
  const visibleFoods = foods
    .filter(({ name }) => name.toLowerCase().includes(normalizedFoodSearch))
    .sort((first, second) => {
      const fieldComparison = foodSortField === 'name'
        ? first.name.localeCompare(second.name)
        : first.nutritionFacts.caloriesKcal - second.nutritionFacts.caloriesKcal;
      const comparison = fieldComparison || first.name.localeCompare(second.name);
      return foodSortDirection === 'ascending' ? comparison : -comparison;
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

  const toggleFoodSortDirection = () => {
    setFoodSortDirection((direction) =>
      direction === 'ascending' ? 'descending' : 'ascending');
  };

  const retryLoading = () => {
    if (foodsQuery.isError) void foodsQuery.refetch();
    if (mealsQuery.isError) void mealsQuery.refetch();
  };

  // Pantry screen
  return (
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
        // Food list controls
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
          </View>
          {/* Food sort field menu */}
          <MenuView
            actions={[
              {
                id: 'name',
                state: foodSortField === 'name' ? 'on' : 'off',
                title: 'Name',
              },
              {
                id: 'calories',
                state: foodSortField === 'calories' ? 'on' : 'off',
                title: 'Calories',
              },
            ]}
            onPressAction={({ nativeEvent }) => {
              if (nativeEvent.event === 'name' || nativeEvent.event === 'calories') {
                setFoodSortField(nativeEvent.event);
              }
            }}
          >
            <View
              accessibilityLabel={`Choose Food sort field, currently ${foodSortField === 'name' ? 'Name' : 'Calories'}`}
              accessibilityRole="button"
              style={[styles.sortButton, { borderColor: colors.border }]}
              testID="pantry-food-sort-field-button"
            >
              {foodSortField === 'name' ? (
                <Text
                  style={[styles.sortButtonText, { color: colors.textPrimary }]}
                  testID="pantry-food-sort-name-label"
                >A-Z</Text>
              ) : (
                <Ionicons
                  color={colors.textPrimary}
                  name="flame-outline"
                  size={20}
                  testID="pantry-food-sort-calories-icon"
                />
              )}
            </View>
          </MenuView>
          {/* Food sort direction button */}
          <Pressable
            accessibilityLabel={`Sort Foods ${foodSortDirection}`}
            accessibilityRole="button"
            onPress={toggleFoodSortDirection}
            style={({ pressed }) => [
              styles.sortDirectionButton,
              { borderColor: colors.border },
              pressed && styles.buttonPressed,
            ]}
            testID="pantry-food-sort-direction-button"
          >
            <Ionicons
              color={colors.textPrimary}
              name={foodSortDirection === 'ascending'
                ? 'arrow-up-outline'
                : 'arrow-down-outline'}
              size={20}
              testID="pantry-food-sort-direction-icon"
            />
          </Pressable>
        </View>
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
          >Try a different search</Text>
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
              {/* Food name */}
              <Text
                style={[styles.foodName, { color: colors.textPrimary }]}
                testID={`pantry-food-${food.id}-name`}
              >{food.name}</Text>
              {/* Calories per serving */}
              <Text
                style={[styles.foodDetail, { color: colors.textSecondary }]}
                testID={`pantry-food-${food.id}-calories`}
              >{food.nutritionFacts.caloriesKcal} kcal per serving</Text>
              {/* Food quantities */}
              <View style={styles.foodDetails}>
                {/* Serving size */}
                <Text
                  style={[styles.foodDetail, { color: colors.textSecondary }]}
                  testID={`pantry-food-${food.id}-serving-size`}
                >Serving: {formatQuantity(food.servingSize)}</Text>
                {/* Current stock */}
                <Text
                  style={[styles.foodDetail, { color: colors.textSecondary }]}
                  testID={`pantry-food-${food.id}-current-stock`}
                >Stock: {formatQuantity(food.currentStock)}</Text>
              </View>
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
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', borderRadius: 12, margin: 24, padding: 14 },
  buttonPressed: { opacity: 0.75 },
  buttonText: { fontSize: 17, fontWeight: '600' },
  centeredState: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center' },
  description: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  emptyState: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  foodCard: { borderRadius: 12, borderWidth: 1, gap: 8, padding: 14 },
  foodControls: { flexDirection: 'row', gap: 10, marginHorizontal: 24, marginTop: 16 },
  foodDetail: { fontSize: 14 },
  foodDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  foodList: { gap: 10, padding: 24 },
  foodName: { fontSize: 17, fontWeight: '600' },
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
  sortButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  sortButtonText: { fontSize: 14, fontWeight: '700' },
  sortDirectionButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
});
