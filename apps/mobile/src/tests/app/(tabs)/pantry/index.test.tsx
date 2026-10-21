import { createElement } from 'react';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listFoods: vi.fn(),
  listMeals: vi.fn(),
  push: vi.fn(),
  refetchFoods: vi.fn(),
  refetchMeals: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Ionicons' }));
vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.useQuery }));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('../../../../api/foods.js', () => ({ listFoods: mocks.listFoods }));
vi.mock('../../../../api/meals.js', () => ({ listMeals: mocks.listMeals }));
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

const meals = [
  {
    createdAt: '2026-10-20T14:00:00.000Z',
    id: '33333333-3333-4333-8333-333333333333',
    ingredients: [
      { foodId: foods[0].id, quantity: { amount: 100, unit: 'g' as const } },
    ],
    name: 'Chicken bowl',
    updatedAt: '2026-10-20T14:00:00.000Z',
    userId: 'user-123',
  },
  {
    createdAt: '2026-10-20T15:00:00.000Z',
    id: '44444444-4444-4444-8444-444444444444',
    ingredients: [
      { foodId: foods[0].id, quantity: { amount: 100, unit: 'g' as const } },
      { foodId: foods[1].id, quantity: { amount: 1, unit: 'item' as const } },
    ],
    name: 'Chicken and yogurt',
    updatedAt: '2026-10-20T15:00:00.000Z',
    userId: 'user-123',
  },
];

type QueryResult<T> = {
  data?: T;
  isError: boolean;
  isPending: boolean;
};

async function renderPantry({
  foodsResult = { data: foods, isError: false, isPending: false },
  mealsResult = { data: [], isError: false, isPending: false },
}: {
  foodsResult?: QueryResult<typeof foods>;
  mealsResult?: QueryResult<typeof meals>;
} = {}) {
  mocks.useQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'foods') {
      return { ...foodsResult, refetch: mocks.refetchFoods };
    }
    return { ...mealsResult, refetch: mocks.refetchMeals };
  });
  await render(createElement(PantryScreen));
}

beforeEach(() => vi.clearAllMocks());

describe('Pantry screen', () => {
  it('registers Food and Meal queries and renders their loading state', async () => {
    await renderPantry({
      foodsResult: { isError: false, isPending: true },
      mealsResult: { isError: false, isPending: true },
    });

    expect(mocks.useQuery).toHaveBeenCalledWith({
      queryFn: mocks.listFoods,
      queryKey: ['foods'],
    });
    expect(mocks.useQuery).toHaveBeenCalledWith({
      queryFn: mocks.listMeals,
      queryKey: ['meals'],
    });
    expect(screen.getByTestId('pantry-loading-indicator')).toBeTruthy();
    expect(screen.queryByTestId('pantry-add-food-button')).toBeNull();
    expect(screen.queryByTestId('pantry-add-meal-button')).toBeNull();
  });

  it('keeps loaded Foods visible while Meals are loading', async () => {
    await renderPantry({
      mealsResult: { isError: false, isPending: true },
    });

    expect(screen.getByTestId('pantry-food-list')).toBeTruthy();
    expect(screen.queryByTestId('pantry-loading-indicator')).toBeNull();

    await fireEvent.press(screen.getByTestId('pantry-meals-tab'));

    expect(screen.getByTestId('pantry-loading-indicator')).toBeTruthy();
  });

  it('renders the error state and retries a failed Food query', async () => {
    await renderPantry({
      foodsResult: { isError: true, isPending: false },
    });

    expect(screen.getByTestId('pantry-error-message')).toHaveTextContent(
      'Unable to load your pantry',
    );
    const retryButton = screen.getByTestId('pantry-retry-load-button');
    expect(retryButton).toHaveTextContent('Try again');
    await fireEvent.press(retryButton);
    expect(mocks.refetchFoods).toHaveBeenCalledOnce();
    expect(mocks.refetchMeals).not.toHaveBeenCalled();
  });

  it('renders the error state and retries a failed Meal query', async () => {
    await renderPantry({
      mealsResult: { isError: true, isPending: false },
    });

    expect(screen.queryByTestId('pantry-error')).toBeNull();
    await fireEvent.press(screen.getByTestId('pantry-meals-tab'));
    await fireEvent.press(screen.getByTestId('pantry-retry-load-button'));

    expect(mocks.refetchMeals).toHaveBeenCalledOnce();
    expect(mocks.refetchFoods).not.toHaveBeenCalled();
  });

  it('renders the empty Foods state and navigates to Food creation', async () => {
    await renderPantry({
      foodsResult: { data: [], isError: false, isPending: false },
    });

    expect(screen.getByTestId('pantry-empty-state-title')).toHaveTextContent(
      'Your pantry is empty',
    );
    expect(screen.getByTestId('pantry-empty-state-description')).toHaveTextContent(
      'Add a food to begin tracking what you have',
    );
    const addFoodButton = screen.getByTestId('pantry-add-food-button');
    expect(addFoodButton).toHaveTextContent('Add first food');
    await fireEvent.press(addFoodButton);
    expect(mocks.push).toHaveBeenCalledWith('/pantry/food/new');
  });

  it('renders Food cards and formats their quantities', async () => {
    await renderPantry();

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
    await renderPantry({
      foodsResult: { data: [], isError: false, isPending: false },
    });

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

  it('directs users with Foods but no Meals to create their first Meal', async () => {
    await renderPantry();

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

  it('renders Meal cards and navigates to Meal creation', async () => {
    await renderPantry({
      mealsResult: { data: meals, isError: false, isPending: false },
    });

    await fireEvent.press(screen.getByTestId('pantry-meals-tab'));

    expect(screen.getByTestId('pantry-meal-list')).toBeTruthy();
    expect(screen.getByTestId(`pantry-meal-${meals[0].id}-name`)).toHaveTextContent(
      'Chicken bowl',
    );
    expect(
      screen.getByTestId(`pantry-meal-${meals[0].id}-ingredient-count`),
    ).toHaveTextContent('1 ingredient');
    expect(screen.getByTestId(`pantry-meal-${meals[1].id}-name`)).toHaveTextContent(
      'Chicken and yogurt',
    );
    expect(
      screen.getByTestId(`pantry-meal-${meals[1].id}-ingredient-count`),
    ).toHaveTextContent('2 ingredients');
    const addMealButton = screen.getByTestId('pantry-add-meal-button');
    expect(addMealButton).toHaveTextContent('Add meal');
    await fireEvent.press(addMealButton);
    expect(mocks.push).toHaveBeenCalledWith('/pantry/meal/new');
  });
});
