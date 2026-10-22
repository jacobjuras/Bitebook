import type { EmptyState } from '../models/emptyState';

export const foodEmptyState: EmptyState = {
  action: 'Add first food',
  description: 'Add a food to begin tracking what you have',
  icon: 'nutrition-outline',
  title: 'Your pantry is empty',
};

export const foodNoResultsState = {
  description: 'Try a different search or filter',
  title: 'No foods found',
};
