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
  mutateFavorite: vi.fn(),
  push: vi.fn(),
  refetchFoods: vi.fn(),
  refetchMeals: vi.fn(),
  setQueryData: vi.fn(),
  updateFood: vi.fn(),
  useMutation: vi.fn(),
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
  useMutation: mocks.useMutation,
  useQuery: mocks.useQuery,
  useQueryClient: () => ({ setQueryData: mocks.setQueryData }),
}));
vi.mock('../../../../api/foods.js', () => ({ updateFood: mocks.updateFood }));
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
vi.mock('../../../../theme/useThemeColors.js', () => ({
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

function renderedFoodCardIds() {
  return screen.getAllByTestId(/^pantry-food-[0-9a-f-]+$/)
    .map(({ props }) => props.testID);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocks.useMutation.mockReturnValue({
    isError: false,
    mutate: mocks.mutateFavorite,
  });
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
    const addFoodButton = screen.getByTestId('pantry-add-food-button');
    expect(addFoodButton).toHaveTextContent('Add first food');
    await fireEvent.press(addFoodButton);
    expect(mocks.push).toHaveBeenCalledWith('/pantry/food/new');
  });

  it('renders Food cards with organization metadata and quantities', async () => {
    await renderPantry();

    expect(screen.getByTestId('pantry-food-controls')).toBeTruthy();
    expect(screen.getByTestId('pantry-food-search-input')).toBeTruthy();
    expect(screen.getByTestId('pantry-food-filter-sort-button')).toBeTruthy();
    expect(screen.queryByTestId('pantry-food-sort-direction-button')).toBeNull();
    expect(screen.getByTestId(`pantry-food-${foods[0].id}`)).toBeTruthy();
    expect(screen.getByTestId(`pantry-food-${foods[0].id}-name`)).toHaveTextContent(
      'Chicken breast',
    );
    expect(
      screen.getByTestId(`pantry-food-${foods[0].id}-calories`),
    ).toHaveTextContent('165 kcal per serving');
    expect(
      screen.getByTestId(`pantry-food-${foods[0].id}-serving-size`),
    ).toHaveTextContent('Serving: 100 g');
    expect(screen.getByTestId(
      `pantry-food-${foods[0].id}-favorite-icon`,
    ).props.name).toBe('star-outline');
    expect(screen.getByTestId(
      `pantry-food-${foods[0].id}-tag-high-protein`,
    )).toHaveTextContent('high-protein');
    expect(screen.getByTestId(
      `pantry-food-${foods[0].id}-tag-savory`,
    )).toHaveTextContent('savory');
    expect(screen.getByTestId(`pantry-food-${foods[1].id}`)).toBeTruthy();
    expect(screen.getByTestId(`pantry-food-${foods[1].id}-name`)).toHaveTextContent(
      'Greek yogurt',
    );
    expect(
      screen.getByTestId(`pantry-food-${foods[1].id}-serving-size`),
    ).toHaveTextContent('Serving: 1 item');
    expect(screen.getByTestId(
      `pantry-food-${foods[1].id}-favorite-icon`,
    ).props.name).toBe('star');
    const addFoodButton = screen.getByTestId('pantry-add-food-button');
    expect(addFoodButton).toHaveTextContent('Add food');
    await fireEvent.press(addFoodButton);
    expect(mocks.push).toHaveBeenCalledWith('/pantry/food/new');
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

    expect(screen.queryByTestId(`pantry-food-${foods[0].id}`)).toBeNull();
    expect(screen.getByTestId(`pantry-food-${foods[1].id}`)).toBeTruthy();

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

  it('updates a Food favorite and replaces its cached record', async () => {
    const updatedFood = { ...foods[0], isFavorite: true };
    mocks.updateFood.mockResolvedValue(updatedFood);
    await renderPantry();

    await fireEvent.press(
      screen.getByTestId(`pantry-food-${foods[0].id}-favorite-button`),
    );
    expect(mocks.mutateFavorite).toHaveBeenCalledWith({
      foodId: foods[0].id,
      isFavorite: true,
    });

    const mutationOptions = mocks.useMutation.mock.calls[0][0];
    await expect(mutationOptions.mutationFn({
      foodId: foods[0].id,
      isFavorite: true,
    })).resolves.toEqual(updatedFood);
    expect(mocks.updateFood).toHaveBeenCalledWith(foods[0].id, {
      isFavorite: true,
    });

    mutationOptions.onSuccess(updatedFood);
    expect(mocks.setQueryData).toHaveBeenCalledWith(
      ['foods'],
      expect.any(Function),
    );
    const updateCache = mocks.setQueryData.mock.calls[0][1];
    expect(updateCache(foods)).toEqual([updatedFood, foods[1]]);
    expect(updateCache(undefined)).toBeUndefined();
  });

  it('shows a favorite update error on only the affected Food', async () => {
    mocks.useMutation.mockReturnValue({
      isError: true,
      mutate: mocks.mutateFavorite,
      variables: { foodId: foods[0].id },
    });

    await renderPantry();

    expect(screen.getByTestId(
      `pantry-food-${foods[0].id}-favorite-error`,
    )).toHaveTextContent('Unable to update favorite');
    expect(screen.queryByTestId(
      `pantry-food-${foods[1].id}-favorite-error`,
    )).toBeNull();
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
    expect(screen.getByTestId('pantry-empty-title')).toHaveTextContent(
      'Create your first meal',
    );
    expect(screen.getByTestId('pantry-empty-description')).toHaveTextContent(
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

    expect(screen.queryByTestId('pantry-food-controls')).toBeNull();
    expect(screen.queryByTestId('pantry-meal-controls')).toBeNull();
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
