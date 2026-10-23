import type { Food } from '@bitebook/domain';
import { act, render, screen } from '@testing-library/react-native';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  createFood: vi.fn(),
  invalidateQueries: vi.fn(),
  refetch: vi.fn(),
  tagsQuery: { data: [] as unknown[], isError: false, isPending: false },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => mocks.tagsQuery,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('expo-router', () => ({ useRouter: () => ({ back: mocks.back }) }));
vi.mock('../../../../../api/foods.js', () => ({ createFood: mocks.createFood }));
vi.mock('../../../../../query/pantryQueries.js', () => ({
  tagsQueryOptions: { queryKey: ['tags'] },
}));
vi.mock('~/components', () => ({
  ContentStateView: (props: object) => createElement('ContentStateView', {
    ...props,
    testID: 'content-state',
  }),
  FoodForm: (props: object) => createElement('FoodForm', {
    ...props,
    testID: 'food-form',
  }),
}));

import NewFoodScreen from '../../../../../app/(tabs)/pantry/food/newFood.js';
import { ContentStateKind } from '~/constants';
import { tagFixtures } from '~/tests/fixtures/tags';

const { fiber, protein } = tagFixtures;
const foodInput = {
  isFavorite: true,
  name: 'Oats',
  newTags: [{ name: 'fiber' }],
  nutritionFacts: { caloriesKcal: 150, micronutrients: {} },
  servingSize: { amount: 40, unit: 'g' as const },
  tagIds: [protein.id],
};
const createdFood: Food = {
  createdAt: '2026-10-22T12:00:00.000Z',
  id: '11111111-1111-4111-8111-111111111111',
  isFavorite: true,
  name: 'Oats',
  nutritionFacts: foodInput.nutritionFacts,
  servingSize: foodInput.servingSize,
  tagIds: [protein.id, fiber.id],
  updatedAt: '2026-10-22T12:00:00.000Z',
  userId: 'user-123',
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mocks.tagsQuery, {
    data: [protein, fiber],
    isError: false,
    isPending: false,
    refetch: mocks.refetch,
  });
});

describe('New Food route', () => {
  it('loads available Tags and submits the atomic form values unchanged', async () => {
    mocks.createFood.mockResolvedValue(createdFood);
    mocks.invalidateQueries.mockResolvedValue(undefined);
    await render(<NewFoodScreen />);

    expect(screen.getByTestId('food-form').props.availableTags)
      .toEqual([protein, fiber]);
    await act(async () => {
      await screen.getByTestId('food-form').props.onSubmit(foodInput);
    });

    expect(mocks.createFood).toHaveBeenCalledOnce();
    expect(mocks.createFood).toHaveBeenCalledWith(foodInput);
    expect(mocks.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['tags'],
    });
    expect(mocks.invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['foods'],
    });
    expect(mocks.back).toHaveBeenCalledOnce();
  });

  it('refreshes only Foods when no new Tag was created', async () => {
    mocks.createFood.mockResolvedValue(createdFood);
    mocks.invalidateQueries.mockResolvedValue(undefined);
    await render(<NewFoodScreen />);

    await act(async () => {
      await screen.getByTestId('food-form').props.onSubmit({
        ...foodInput,
        newTags: undefined,
      });
    });

    expect(mocks.invalidateQueries).toHaveBeenCalledOnce();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['foods'] });
  });

  it('shows an error and remains on the form after atomic creation fails', async () => {
    mocks.createFood.mockRejectedValue(new Error('unavailable'));
    await render(<NewFoodScreen />);

    await act(async () => {
      await screen.getByTestId('food-form').props.onSubmit(foodInput);
    });

    expect(screen.getByTestId('food-form').props.error).toBe(
      'Unable to save this Food. Try again.',
    );
    expect(screen.getByTestId('food-form').props.isSubmitting).toBe(false);
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
    expect(mocks.back).not.toHaveBeenCalled();
  });

  it('waits for the Tag registry before rendering the form', async () => {
    Object.assign(mocks.tagsQuery, { data: undefined, isPending: true });
    await render(<NewFoodScreen />);

    expect(screen.getByTestId('content-state').props.state)
      .toEqual({ kind: ContentStateKind.Loading });
    expect(screen.queryByTestId('food-form')).toBeNull();
  });

  it('offers a retry when the Tag registry cannot load', async () => {
    Object.assign(mocks.tagsQuery, { data: undefined, isError: true });
    await render(<NewFoodScreen />);

    const state = screen.getByTestId('content-state').props.state;
    expect(state).toMatchObject({
      kind: ContentStateKind.Error,
      message: 'Unable to load Tags.',
    });
    state.onRetry();
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
});
