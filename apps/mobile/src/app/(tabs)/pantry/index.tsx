import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import type { Food, Quantity } from '@bitebook/domain';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listFoods } from '../../../api/foods';
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
  const colors = useThemeColors();
  const [selectedSection, setSelectedSection] = useState<PantrySection>('foods');
  const foodsQuery = useQuery({ queryKey: ['foods'], queryFn: listFoods });
  const foods = foodsQuery.data ?? [];
  const hasFoods = foods.length > 0;
  const shouldAddFood = selectedSection === 'foods' || !hasFoods;
  const selectedSectionEmptyState = selectedSection === 'foods'
    ? foodEmptyState
    : mealEmptyStates[hasFoods ? 'withFoods' : 'withoutFoods'];
  const actionLabel = selectedSection === 'foods' && hasFoods
    ? 'Add food'
    : selectedSectionEmptyState.action;
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
      {foodsQuery.isPending ? (
        // Pantry loading state
        <ActivityIndicator
          color={colors.accent}
          style={styles.centeredState}
          testID="pantry-loading-indicator"
        />
      ) : foodsQuery.isError ? (
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
            onPress={() => void foodsQuery.refetch()}
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
      ) : selectedSection === 'foods' && hasFoods ? (
        // Food card list
        <ScrollView contentContainerStyle={styles.foodList} testID="pantry-food-list">
          {foods.map((food: Food) => (
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
      {!foodsQuery.isPending && !foodsQuery.isError ? (
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
  foodDetail: { fontSize: 14 },
  foodDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  foodList: { gap: 10, padding: 24 },
  foodName: { fontSize: 17, fontWeight: '600' },
  heading: { fontSize: 34, fontWeight: '700', margin: 24, marginBottom: 18 },
  iconCircle: { alignItems: 'center', borderRadius: 30, height: 60, justifyContent: 'center', width: 60 },
  retryButton: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  screen: { flex: 1 },
  segment: { alignItems: 'center', borderRadius: 8, flex: 1, padding: 8 },
  segmentedControl: { borderRadius: 10, flexDirection: 'row', marginHorizontal: 24, padding: 3 },
  segmentText: { fontSize: 15, fontWeight: '600' },
});
