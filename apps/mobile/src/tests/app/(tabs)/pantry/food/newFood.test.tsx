import type { Food } from '@bitebook/domain';
import { act, render, screen } from '@testing-library/react-native';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  createFood: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('expo-router', () => ({
  useRouter: () => ({ back: mocks.back }),
}));
vi.mock('../../../../../api/foods.js', () => ({
  createFood: mocks.createFood,
}));
vi.mock('~/components', () => ({
  FoodForm: (props: object) => createElement('FoodForm', {
    ...props,
    testID: 'food-form',
  }),
}));

import NewFoodScreen from '../../../../../app/(tabs)/pantry/food/newFood.js';

const foodInput = {
  isFavorite: true,
  name: 'Oats',
  nutritionFacts: { caloriesKcal: 150, micronutrients: {} },
  servingSize: { amount: 40, unit: 'g' as const },
  tags: ['breakfast'],
};

const createdFood: Food = {
  ...foodInput,
  createdAt: '2026-10-22T12:00:00.000Z',
  id: '11111111-1111-4111-8111-111111111111',
  updatedAt: '2026-10-22T12:00:00.000Z',
  userId: 'user-123',
};

beforeEach(() => vi.clearAllMocks());

describe('New Food route', () => {
  it('creates the Food, refreshes Pantry, and returns after success', async () => {
    mocks.createFood.mockResolvedValue(createdFood);
    mocks.invalidateQueries.mockResolvedValue(undefined);
    await render(<NewFoodScreen />);

    await act(async () => {
      await screen.getByTestId('food-form').props.onSubmit(foodInput);
    });

    expect(mocks.createFood).toHaveBeenCalledWith(foodInput);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['foods'] });
    expect(mocks.back).toHaveBeenCalledOnce();
  });

  it('shows an error and remains on the form after creation fails', async () => {
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
});
