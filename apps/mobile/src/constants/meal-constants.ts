import type { EmptyState } from '../models/emptyState';

export const mealEmptyStates: Record<
  'withFoods' | 'withoutFoods',
  EmptyState
> = {
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

export const mealNoResultsState = {
  description: 'Try a different search',
  title: 'No meals found',
};
