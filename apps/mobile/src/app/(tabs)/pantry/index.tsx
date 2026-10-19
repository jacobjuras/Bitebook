import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function PantryScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [section, setSection] = useState<PantrySection>('foods');

  const hasFoods = false;
  const emptyState =
    section === 'foods'
      ? foodEmptyState
      : mealEmptyStates[hasFoods ? 'withFoods' : 'withoutFoods'];

  const handleAction = () => {
    if (section === 'foods' || !hasFoods) {
      router.push('/pantry/food/new');
      return;
    }

    router.push('/pantry/meal/new');
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.heading, { color: colors.textPrimary }]}>Pantry</Text>
      <View style={[styles.segmentedControl, { backgroundColor: colors.control }]}>
        {(['foods', 'meals'] as const).map((value) => {
          const selected = section === value;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={value}
              onPress={() => setSection(value)}
              style={[
                styles.segment,
                selected && { backgroundColor: colors.controlSelected },
              ]}
            >
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
      <View style={styles.emptyState}>
        <View
          style={[styles.iconCircle, { backgroundColor: colors.accentSubtle }]}
        >
          <Ionicons color={colors.accent} name={emptyState.icon} size={30} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          {emptyState.title}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {emptyState.description}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={handleAction}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.accent },
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.onAccent }]}>{emptyState.action}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 12,
    margin: 24,
    padding: 14,
  },
  buttonPressed: { opacity: 0.75 },
  buttonText: { fontSize: 17, fontWeight: '600' },
  description: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  heading: { fontSize: 34, fontWeight: '700', margin: 24, marginBottom: 18 },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  screen: { flex: 1 },
  segment: { alignItems: 'center', borderRadius: 8, flex: 1, padding: 8 },
  segmentedControl: {
    borderRadius: 10,
    flexDirection: 'row',
    marginHorizontal: 24,
    padding: 3,
  },
  segmentText: { fontSize: 15, fontWeight: '600' },
});
