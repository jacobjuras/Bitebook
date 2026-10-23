import type { Food } from '@bitebook/domain';
import { createElement, type ReactNode } from 'react';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import {
  Keyboard,
} from 'react-native';
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
vi.mock('@expo/ui/community/menu', async () => {
  const { createElement } = await vi.importActual<typeof import('react')>('react');
  return {
    MenuView: ({ actions, children, ...props }: {
      actions: unknown[];
      children: ReactNode;
      testID?: string;
    }) => createElement(
      'MenuView',
      { ...props, actions },
      children,
    ),
  };
});
vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
}));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('../../../../query/pantryQueries.js', () => ({
  foodsQueryOptions: {
    queryFn: mocks.listFoods,
    queryKey: ['foods'],
    staleTime: Infinity,
  },
  mealsQueryOptions: {
    queryFn: mocks.listMeals,
    queryKey: ['meals'],
    staleTime: Infinity,
  },
}));
vi.mock('~/theme', () => ({
  useThemeColors: () => ({
    accent: 'accent',
    accentSubtle: 'accent-subtle',
    background: 'background',
    border: 'border',
    control: 'control',
    controlSelected: 'control-selected',
    danger: 'danger',
    onAccent: 'on-accent',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import PantryScreen from '../../../../app/(tabs)/pantry/index.js';

const foods: Food[] = [
  {
    createdAt: '2026-10-20T12:00:00.000Z',
    id: '11111111-1111-4111-8111-111111111111',
    lastLoggedAt: '2026-10-21T10:00:00.000Z',
    name: 'Chicken breast',
    nutritionFacts: { caloriesKcal: 165, micronutrients: {}, proteinG: 31 },
    servingSize: { amount: 100, unit: 'g' as const },
    tags: ['high-protein', 'savory'],
    updatedAt: '2026-10-20T12:00:00.000Z',
    userId: 'user-123',
  },
  {
    createdAt: '2026-10-20T13:00:00.000Z',
    id: '22222222-2222-4222-8222-222222222222',
    isFavorite: true,
    name: 'Greek yogurt',
    nutritionFacts: { caloriesKcal: 100, micronutrients: {} },
    servingSize: { amount: 1, unit: 'item' as const },
    tags: ['breakfast', 'high-protein'],
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
    tags: ['high-protein', 'savory'],
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
    isFavorite: true,
    name: 'Chicken and yogurt',
    tags: ['breakfast', 'high-protein'],
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

function renderedFoodCardIds() {
  return screen.getAllByTestId(/^pantry-food-[0-9a-f-]+-card$/)
    .map(({ props }) => props.testID.replace(/-card$/, ''));
}

function renderedMealCardIds() {
  return screen.getAllByTestId(/^pantry-meal-[0-9a-f-]+-card$/)
    .map(({ props }) => props.testID.replace(/-card$/, ''));
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('Pantry screen', () => {
  it('registers Food and Meal queries and renders their loading state', async () => {
    await renderPantry({
      foodsResult: { isError: false, isPending: true },
      mealsResult: { isError: false, isPending: true },
    });

    expect(mocks.useQuery).toHaveBeenCalledWith({
      queryFn: mocks.listFoods,
      queryKey: ['foods'],
      staleTime: Infinity,
    });
    expect(mocks.useQuery).toHaveBeenCalledWith({
      queryFn: mocks.listMeals,
      queryKey: ['meals'],
      staleTime: Infinity,
    });
    expect(screen.getByTestId('pantry-loading-indicator')).toBeTruthy();
    expect(screen.queryByTestId('pantry-food-add-button')).toBeNull();
    expect(screen.queryByTestId('pantry-meal-add-button')).toBeNull();
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
    const retryButton = screen.getByTestId('pantry-retry-button');
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
    await fireEvent.press(screen.getByTestId('pantry-retry-button'));

    expect(mocks.refetchMeals).toHaveBeenCalledOnce();
    expect(mocks.refetchFoods).not.toHaveBeenCalled();
  });

  it('renders the empty Foods state and navigates to Food creation', async () => {
    await renderPantry({
      foodsResult: { data: [], isError: false, isPending: false },
    });

    expect(screen.queryByTestId('pantry-food-controls')).toBeNull();
    expect(screen.getByTestId('pantry-empty-title')).toHaveTextContent(
      'Your pantry is empty',
    );
    expect(screen.getByTestId('pantry-empty-description')).toHaveTextContent(
      'Add a food to begin tracking what you have',
    );
    const addFoodButton = screen.getByTestId('pantry-food-add-button');
    expect(addFoodButton).toHaveTextContent('Add first food');
    await fireEvent.press(addFoodButton);
    expect(mocks.push).toHaveBeenCalledWith('/pantry/food/newFood');
  });

  it('renders Food cards with organization metadata and quantities', async () => {
    await renderPantry();

    expect(screen.getByTestId('pantry-food-controls')).toBeTruthy();
    expect(screen.getByTestId('pantry-food-search-input')).toBeTruthy();
    expect(screen.getByTestId('pantry-food-filter-sort-button')).toBeTruthy();
    expect(screen.queryByTestId('pantry-food-sort-direction-button')).toBeNull();
    expect(screen.getByTestId(`pantry-food-${foods[0].id}-card`)).toBeTruthy();
    expect(screen.getByTestId(`pantry-food-${foods[0].id}-card-title`)).toHaveTextContent(
      'Chicken breast',
    );
    expect(
      screen.getByTestId(`pantry-food-${foods[0].id}-summary`),
    ).toHaveTextContent('165 kcal · 31 g protein');
    expect(screen.queryByTestId(
      `pantry-food-${foods[0].id}-favorite-indicator`,
    )).toBeNull();
    expect(screen.getByTestId(
      `pantry-food-${foods[0].id}-chip-high-protein`,
    )).toHaveTextContent('high-protein');
    expect(screen.getByTestId(
      `pantry-food-${foods[0].id}-chip-savory`,
    )).toHaveTextContent('savory');
    expect(screen.getByTestId(`pantry-food-${foods[1].id}-card`)).toBeTruthy();
    expect(screen.getByTestId(`pantry-food-${foods[1].id}-card-title`)).toHaveTextContent(
      'Greek yogurt',
    );
    expect(
      screen.getByTestId(`pantry-food-${foods[1].id}-summary`),
    ).toHaveTextContent('100 kcal');
    expect(screen.getByTestId(
      `pantry-food-${foods[1].id}-favorite-indicator`,
    )).toBeTruthy();
    const addFoodButton = screen.getByTestId('pantry-food-add-button');
    expect(addFoodButton).toHaveTextContent('Add food');
    await fireEvent.press(addFoodButton);
    expect(mocks.push).toHaveBeenCalledWith('/pantry/food/newFood');
  });

  it('dismisses the focused Food search keyboard on a background tap', async () => {
    const dismissKeyboard = vi.spyOn(Keyboard, 'dismiss').mockImplementation(
      () => undefined,
    );
    await renderPantry();

    await fireEvent(screen.getByTestId('pantry-food-search-input'), 'focus');
    await fireEvent.press(screen.getByTestId('pantry-dismiss-keyboard'));

    expect(dismissKeyboard).toHaveBeenCalledOnce();
    expect(screen.getByTestId('pantry-dismiss-keyboard').props.accessible)
      .toBe(false);
  });

  it('filters Foods by name and renders a no-results state', async () => {
    await renderPantry();
    const searchInput = screen.getByTestId('pantry-food-search-input');

    await fireEvent.changeText(searchInput, 'YOG');

    expect(screen.queryByTestId(`pantry-food-${foods[0].id}-card`)).toBeNull();
    expect(screen.getByTestId(`pantry-food-${foods[1].id}-card`)).toBeTruthy();

    await fireEvent.changeText(searchInput, 'missing');

    expect(screen.queryByTestId('pantry-food-list')).toBeNull();
    expect(screen.getByTestId('pantry-no-results-title')).toHaveTextContent(
      'No foods found',
    );
    expect(
      screen.getByTestId('pantry-no-results-description'),
    ).toHaveTextContent('Try a different search or filter');
  });

  it('combines Favorites and tag filters when selecting visible Foods', async () => {
    await renderPantry();
    const filterSortMenu = screen.getByTestId('pantry-food-filter-sort-menu');

    await fireEvent(filterSortMenu, 'pressAction', {
      nativeEvent: { event: 'favorites' },
    });
    expect(renderedFoodCardIds()).toEqual([`pantry-food-${foods[1].id}`]);

    await fireEvent(filterSortMenu, 'pressAction', {
      nativeEvent: { event: 'tag:high-protein' },
    });
    expect(renderedFoodCardIds()).toEqual([`pantry-food-${foods[1].id}`]);

    await fireEvent(filterSortMenu, 'pressAction', {
      nativeEvent: { event: 'favorites' },
    });
    await fireEvent(filterSortMenu, 'pressAction', {
      nativeEvent: { event: 'tag:savory' },
    });
    expect(renderedFoodCardIds()).toEqual([`pantry-food-${foods[0].id}`]);
  });

  it('defaults to newest recent Foods and supports oldest first', async () => {
    await renderPantry();

    expect(renderedFoodCardIds()).toEqual([
      `pantry-food-${foods[0].id}`,
      `pantry-food-${foods[1].id}`,
    ]);

    await fireEvent(
      screen.getByTestId('pantry-food-filter-sort-menu'),
      'pressAction',
      { nativeEvent: { event: 'sort:recent:ascending' } },
    );

    expect(renderedFoodCardIds()).toEqual([
      `pantry-food-${foods[1].id}`,
      `pantry-food-${foods[0].id}`,
    ]);
  });

  it('sorts Foods through contextual field selections', async () => {
    await renderPantry();
    const filterSortMenu = screen.getByTestId('pantry-food-filter-sort-menu');

    await fireEvent(filterSortMenu, 'pressAction', {
      nativeEvent: { event: 'sort:calories:ascending' },
    });

    expect(renderedFoodCardIds()).toEqual([
      `pantry-food-${foods[1].id}`,
      `pantry-food-${foods[0].id}`,
    ]);

    await fireEvent(filterSortMenu, 'pressAction', {
      nativeEvent: { event: 'sort:calories:descending' },
    });

    expect(renderedFoodCardIds()).toEqual([
      `pantry-food-${foods[0].id}`,
      `pantry-food-${foods[1].id}`,
    ]);

    await fireEvent(filterSortMenu, 'pressAction', {
      nativeEvent: { event: 'sort:name:ascending' },
    });

    expect(renderedFoodCardIds()).toEqual([
      `pantry-food-${foods[0].id}`,
      `pantry-food-${foods[1].id}`,
    ]);
  });

  it('uses Food name to break equal-calorie ties', async () => {
    const equalCalorieFoods = [
      foods[1],
      {
        ...foods[0],
        nutritionFacts: { ...foods[0].nutritionFacts, caloriesKcal: 100 },
      },
    ];
    await renderPantry({
      foodsResult: {
        data: equalCalorieFoods,
        isError: false,
        isPending: false,
      },
    });

    await fireEvent(
      screen.getByTestId('pantry-food-filter-sort-menu'),
      'pressAction',
      { nativeEvent: { event: 'sort:calories:ascending' } },
    );

    expect(renderedFoodCardIds()).toEqual([
      `pantry-food-${foods[0].id}`,
      `pantry-food-${foods[1].id}`,
    ]);
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
    expect(screen.getByTestId('pantry-empty-title')).toHaveTextContent(
      'Add food before making a meal',
    );
    expect(screen.getByTestId('pantry-empty-description')).toHaveTextContent(
      'Saved meals are made from foods in your pantry',
    );
    const addFoodButton = screen.getByTestId('pantry-food-add-button');
    expect(addFoodButton).toHaveTextContent('Add first food');
    await fireEvent.press(addFoodButton);
    expect(mocks.push).toHaveBeenCalledWith('/pantry/food/newFood');
  });

  it('directs users with Foods but no Meals to create their first Meal', async () => {
    await renderPantry();

    const mealsTab = screen.getByTestId('pantry-meals-tab');
    await fireEvent.press(mealsTab);

    expect(mealsTab.props.accessibilityState.selected).toBe(true);
    expect(screen.queryByTestId('pantry-food-list')).toBeNull();
    expect(screen.getByTestId('pantry-empty-title')).toHaveTextContent(
      'Create your first meal',
    );
    expect(screen.getByTestId('pantry-empty-description')).toHaveTextContent(
      'Combine foods you eat together into a reusable meal',
    );
    const addMealButton = screen.getByTestId('pantry-meal-add-button');
    expect(addMealButton).toHaveTextContent('Create first meal');
    await fireEvent.press(addMealButton);
    expect(mocks.push).toHaveBeenCalledWith('/pantry/meal/newMeal');
  });

  it('renders Meal controls, cards, and creation navigation', async () => {
    await renderPantry({
      mealsResult: { data: meals, isError: false, isPending: false },
    });

    await fireEvent.press(screen.getByTestId('pantry-meals-tab'));

    expect(screen.queryByTestId('pantry-food-controls')).toBeNull();
    expect(screen.getByTestId('pantry-meal-controls')).toBeTruthy();
    expect(screen.getByTestId('pantry-meal-search-input')).toBeTruthy();
    expect(screen.getByTestId('pantry-meal-filter-sort-button')).toBeTruthy();
    expect(screen.getByTestId('pantry-meal-list')).toBeTruthy();
    expect(renderedMealCardIds()).toEqual([
      `pantry-meal-${meals[1].id}`,
      `pantry-meal-${meals[0].id}`,
    ]);
    expect(
      screen.getByTestId(`pantry-meal-${meals[0].id}-card-title`),
    ).toHaveTextContent('Chicken bowl');
    expect(
      screen.getByTestId(`pantry-meal-${meals[0].id}-ingredient-count`),
    ).toHaveTextContent('1 ingredient');
    expect(
      screen.getByTestId(`pantry-meal-${meals[1].id}-card-title`),
    ).toHaveTextContent('Chicken and yogurt');
    expect(
      screen.getByTestId(`pantry-meal-${meals[1].id}-ingredient-count`),
    ).toHaveTextContent('2 ingredients');
    expect(screen.getByTestId(
      `pantry-meal-${meals[0].id}-chip-savory`,
    )).toHaveTextContent('savory');
    expect(screen.queryByTestId(
      `pantry-meal-${meals[0].id}-favorite-indicator`,
    )).toBeNull();
    expect(screen.getByTestId(
      `pantry-meal-${meals[1].id}-favorite-indicator`,
    )).toBeTruthy();
    const addMealButton = screen.getByTestId('pantry-meal-add-button');
    expect(addMealButton).toHaveTextContent('Add meal');
    await fireEvent.press(addMealButton);
    expect(mocks.push).toHaveBeenCalledWith('/pantry/meal/newMeal');
  });

  it('filters Meals by name and renders a no-results state', async () => {
    await renderPantry({
      mealsResult: { data: meals, isError: false, isPending: false },
    });
    await fireEvent.press(screen.getByTestId('pantry-meals-tab'));
    const searchInput = screen.getByTestId('pantry-meal-search-input');

    await fireEvent.changeText(searchInput, 'BOWL');

    expect(screen.getByTestId(`pantry-meal-${meals[0].id}-card`)).toBeTruthy();
    expect(screen.queryByTestId(`pantry-meal-${meals[1].id}-card`)).toBeNull();

    await fireEvent.changeText(searchInput, 'missing');

    expect(screen.queryByTestId('pantry-meal-list')).toBeNull();
    expect(screen.getByTestId('pantry-no-results-title')).toHaveTextContent(
      'No meals found',
    );
    expect(screen.getByTestId('pantry-no-results-description'))
      .toHaveTextContent('Try a different search');
  });

  it('combines Meal favorite and tag filters independently from Foods', async () => {
    await renderPantry({
      mealsResult: { data: meals, isError: false, isPending: false },
    });
    await fireEvent.press(screen.getByTestId('pantry-meals-tab'));
    const filterSortMenu = screen.getByTestId('pantry-meal-filter-sort-menu');

    await fireEvent(filterSortMenu, 'pressAction', {
      nativeEvent: { event: 'favorites' },
    });
    expect(renderedMealCardIds()).toEqual([`pantry-meal-${meals[1].id}`]);

    await fireEvent(filterSortMenu, 'pressAction', {
      nativeEvent: { event: 'tag:high-protein' },
    });
    expect(renderedMealCardIds()).toEqual([`pantry-meal-${meals[1].id}`]);

    await fireEvent.press(screen.getByTestId('pantry-foods-tab'));
    expect(renderedFoodCardIds()).toEqual([
      `pantry-food-${foods[0].id}`,
      `pantry-food-${foods[1].id}`,
    ]);

    await fireEvent.press(screen.getByTestId('pantry-meals-tab'));
    expect(renderedMealCardIds()).toEqual([`pantry-meal-${meals[1].id}`]);

    await fireEvent.press(screen.getByTestId('pantry-meal-clear-filters-button'));
    expect(renderedMealCardIds()).toEqual([
      `pantry-meal-${meals[1].id}`,
      `pantry-meal-${meals[0].id}`,
    ]);
  });

  it('sorts Meals by recent, calories, and name', async () => {
    await renderPantry({
      mealsResult: { data: meals, isError: false, isPending: false },
    });
    await fireEvent.press(screen.getByTestId('pantry-meals-tab'));
    const filterSortMenu = screen.getByTestId('pantry-meal-filter-sort-menu');

    expect(renderedMealCardIds()).toEqual([
      `pantry-meal-${meals[1].id}`,
      `pantry-meal-${meals[0].id}`,
    ]);

    await fireEvent(filterSortMenu, 'pressAction', {
      nativeEvent: { event: 'sort:recent:ascending' },
    });
    expect(renderedMealCardIds()).toEqual([
      `pantry-meal-${meals[0].id}`,
      `pantry-meal-${meals[1].id}`,
    ]);

    await fireEvent(filterSortMenu, 'pressAction', {
      nativeEvent: { event: 'sort:calories:descending' },
    });
    expect(renderedMealCardIds()).toEqual([
      `pantry-meal-${meals[1].id}`,
      `pantry-meal-${meals[0].id}`,
    ]);

    await fireEvent(filterSortMenu, 'pressAction', {
      nativeEvent: { event: 'sort:name:descending' },
    });
    expect(renderedMealCardIds()).toEqual([
      `pantry-meal-${meals[0].id}`,
      `pantry-meal-${meals[1].id}`,
    ]);
  });
});
