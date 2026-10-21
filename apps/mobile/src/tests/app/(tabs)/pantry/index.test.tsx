import { createElement } from 'react';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listFoods: vi.fn(),
  push: vi.fn(),
  refetch: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Ionicons' }));
vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.useQuery }));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('../../../../api/foods.js', () => ({ listFoods: mocks.listFoods }));
vi.mock('../../../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    accent: 'accent',
    accentSubtle: 'accent-subtle',
    background: 'background',
    border: 'border',
    control: 'control',
    controlSelected: 'control-selected',
    onAccent: 'on-accent',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import PantryScreen from '../../../../app/(tabs)/pantry/index.js';

const foods = [
  {
    createdAt: '2026-10-20T12:00:00.000Z',
    currentStock: { amount: 1200, unit: 'g' as const },
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Chicken breast',
    nutritionFacts: { caloriesKcal: 165, micronutrients: {}, proteinG: 31 },
    servingSize: { amount: 100, unit: 'g' as const },
    updatedAt: '2026-10-20T12:00:00.000Z',
    userId: 'user-123',
  },
  {
    createdAt: '2026-10-20T13:00:00.000Z',
    currentStock: { amount: 3, unit: 'item' as const },
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Greek yogurt',
    nutritionFacts: { caloriesKcal: 100, micronutrients: {} },
    servingSize: { amount: 1, unit: 'item' as const },
    updatedAt: '2026-10-20T13:00:00.000Z',
    userId: 'user-123',
  },
];

async function renderPantry(queryResult: {
  data?: typeof foods;
  isError: boolean;
  isPending: boolean;
}) {
  mocks.useQuery.mockReturnValue({
    ...queryResult,
    refetch: mocks.refetch,
  });
  await render(createElement(PantryScreen));
}

beforeEach(() => vi.clearAllMocks());

describe('Pantry screen', () => {
  it('registers the Foods query and renders its loading state', async () => {
    await renderPantry({ isError: false, isPending: true });

    expect(mocks.useQuery).toHaveBeenCalledWith({
      queryFn: mocks.listFoods,
      queryKey: ['foods'],
    });
    expect(screen.getByTestId('pantry-loading-indicator')).toBeTruthy();
    expect(screen.queryByTestId('pantry-add-food-button')).toBeNull();
    expect(screen.queryByTestId('pantry-add-meal-button')).toBeNull();
  });

  it('renders the error state and retries the Foods query', async () => {
    await renderPantry({ isError: true, isPending: false });

    const errorMessage = screen.getByTestId('pantry-error-message');
    expect(errorMessage).toBeTruthy();
    expect(errorMessage).toHaveTextContent('Unable to load your pantry');
    const retryButton = screen.getByTestId('pantry-retry-load-button');
    expect(retryButton).toBeTruthy();
    expect(retryButton).toHaveTextContent('Try again');
    await fireEvent.press(retryButton);
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it('renders the empty Foods state and navigates to Food creation', async () => {
    await renderPantry({ data: [], isError: false, isPending: false });

    const emptyStateTitle = screen.getByTestId('pantry-empty-state-title');
    expect(emptyStateTitle).toBeTruthy();
    expect(emptyStateTitle).toHaveTextContent('Your pantry is empty');
    expect(screen.getByTestId('pantry-empty-state-description')).toHaveTextContent(
      'Add a food to begin tracking what you have',
    );
    const addFoodButton = screen.getByTestId('pantry-add-food-button');
    expect(addFoodButton).toBeTruthy();
    expect(addFoodButton).toHaveTextContent('Add first food');
    await fireEvent.press(addFoodButton);
    expect(mocks.push).toHaveBeenCalledWith('/pantry/food/new');
  });

  it('renders Food cards and formats their quantities', async () => {
    await renderPantry({ data: foods, isError: false, isPending: false });

    expect(screen.getByTestId(`pantry-food-${foods[0].id}`)).toBeTruthy();
    expect(screen.getByTestId(`pantry-food-${foods[0].id}-name`)).toHaveTextContent(
      'Chicken breast',
    );
    expect(
      screen.getByTestId(`pantry-food-${foods[0].id}-serving-size`),
    ).toHaveTextContent('Serving: 100 g');
    expect(
      screen.getByTestId(`pantry-food-${foods[0].id}-current-stock`),
    ).toHaveTextContent('Stock: 1200 g');
    expect(screen.getByTestId(`pantry-food-${foods[1].id}`)).toBeTruthy();
    expect(screen.getByTestId(`pantry-food-${foods[1].id}-name`)).toHaveTextContent(
      'Greek yogurt',
    );
    expect(
      screen.getByTestId(`pantry-food-${foods[1].id}-serving-size`),
    ).toHaveTextContent('Serving: 1 item');
    expect(
      screen.getByTestId(`pantry-food-${foods[1].id}-current-stock`),
    ).toHaveTextContent('Stock: 3 items');
    const addFoodButton = screen.getByTestId('pantry-add-food-button');
    expect(addFoodButton).toHaveTextContent('Add food');
    await fireEvent.press(addFoodButton);
    expect(mocks.push).toHaveBeenCalledWith('/pantry/food/new');
  });

  it('directs users without Foods to add Food from the Meals section', async () => {
    await renderPantry({ data: [], isError: false, isPending: false });

    const foodsTab = screen.getByTestId('pantry-foods-tab');
    const mealsTab = screen.getByTestId('pantry-meals-tab');
    expect(foodsTab.props.accessibilityState.selected).toBe(true);
    expect(mealsTab.props.accessibilityState.selected).toBe(false);

    await fireEvent.press(mealsTab);

    expect(foodsTab.props.accessibilityState.selected).toBe(false);
    expect(mealsTab.props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('pantry-empty-state-title')).toHaveTextContent(
      'Add food before making a meal',
    );
    expect(screen.getByTestId('pantry-empty-state-description')).toHaveTextContent(
      'Saved meals are made from foods in your pantry',
    );
    const addFoodButton = screen.getByTestId('pantry-add-food-button');
    expect(addFoodButton).toHaveTextContent('Add first food');
    await fireEvent.press(addFoodButton);
    expect(mocks.push).toHaveBeenCalledWith('/pantry/food/new');
  });

  it('directs users with Foods to create a Meal from the Meals section', async () => {
    await renderPantry({ data: foods, isError: false, isPending: false });

    const mealsTab = screen.getByTestId('pantry-meals-tab');
    await fireEvent.press(mealsTab);

    expect(mealsTab.props.accessibilityState.selected).toBe(true);
    expect(screen.queryByTestId('pantry-food-list')).toBeNull();
    expect(screen.getByTestId('pantry-empty-state-title')).toHaveTextContent(
      'Create your first meal',
    );
    expect(screen.getByTestId('pantry-empty-state-description')).toHaveTextContent(
      'Combine foods you eat together into a reusable meal',
    );
    const addMealButton = screen.getByTestId('pantry-add-meal-button');
    expect(addMealButton).toHaveTextContent('Create first meal');
    await fireEvent.press(addMealButton);
    expect(mocks.push).toHaveBeenCalledWith('/pantry/meal/new');
  });
});
