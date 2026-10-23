import type { Food } from '@bitebook/domain';
import { act, render, screen } from '@testing-library/react-native';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  createFood: vi.fn(),
  ensureQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    ensureQueryData: mocks.ensureQueryData,
    invalidateQueries: mocks.invalidateQueries,
  }),
}));
vi.mock('expo-router', () => ({
  useRouter: () => ({ back: mocks.back }),
}));
vi.mock('../../../../../api/foods.js', () => ({
  createFood: mocks.createFood,
}));
vi.mock('../../../../../query/pantryQueries.js', () => ({
  tagsQueryOptions: { queryKey: ['tags'] },
}));
vi.mock('~/components', () => ({
  FoodForm: (props: object) => createElement('FoodForm', {
    ...props,
    testID: 'food-form',
  }),
}));

import NewFoodScreen from '../../../../../app/(tabs)/pantry/food/newFood.js';
import { tagFixtures } from '~/tests/fixtures/tags';

const proteinTag = tagFixtures.protein;
const fiberTag = tagFixtures.fiber;
const foodInput = {
  isFavorite: true,
  name: 'Oats',
  nutritionFacts: { caloriesKcal: 150, micronutrients: {} },
  servingSize: { amount: 40, unit: 'g' as const },
  tagNames: ['protein', 'fiber'],
};
const createdFood: Food = {
  createdAt: '2026-10-22T12:00:00.000Z',
  id: '11111111-1111-4111-8111-111111111111',
  isFavorite: foodInput.isFavorite,
  name: foodInput.name,
  nutritionFacts: foodInput.nutritionFacts,
  servingSize: foodInput.servingSize,
  tagIds: [proteinTag.id, fiberTag.id],
  updatedAt: '2026-10-22T12:00:00.000Z',
  userId: 'user-123',
};

beforeEach(() => vi.clearAllMocks());

describe('New Food route', () => {
  it('submits existing and new Tags with the Food in one request', async () => {
    mocks.ensureQueryData.mockResolvedValue([proteinTag]);
    mocks.createFood.mockResolvedValue(createdFood);
    mocks.invalidateQueries.mockResolvedValue(undefined);
    await render(<NewFoodScreen />);

    await act(async () => {
      await screen.getByTestId('food-form').props.onSubmit(foodInput);
    });

    expect(mocks.ensureQueryData).toHaveBeenCalledWith({ queryKey: ['tags'] });
    expect(mocks.createFood).toHaveBeenCalledOnce();
    expect(mocks.createFood).toHaveBeenCalledWith({
      isFavorite: true,
      name: 'Oats',
      newTags: [{ name: 'fiber' }],
      nutritionFacts: { caloriesKcal: 150, micronutrients: {} },
      servingSize: { amount: 40, unit: 'g' },
      tagIds: [proteinTag.id],
    });
    expect(mocks.invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: ['tags'],
    });
    expect(mocks.invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: ['foods'],
    });
    expect(mocks.back).toHaveBeenCalledOnce();
  });

  it('does not refresh Tags when every entered Tag already exists', async () => {
    mocks.ensureQueryData.mockResolvedValue([proteinTag]);
    mocks.createFood.mockResolvedValue(createdFood);
    mocks.invalidateQueries.mockResolvedValue(undefined);
    await render(<NewFoodScreen />);

    await act(async () => {
      await screen.getByTestId('food-form').props.onSubmit({
        ...foodInput,
        tagNames: ['protein'],
      });
    });

    expect(mocks.createFood).toHaveBeenCalledWith(expect.objectContaining({
      tagIds: [proteinTag.id],
    }));
    expect(mocks.createFood.mock.calls[0]?.[0]).not.toHaveProperty('newTags');
    expect(mocks.invalidateQueries).toHaveBeenCalledOnce();
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['foods'] });
  });

  it('does not load Tags when creating an untagged Food', async () => {
    mocks.createFood.mockResolvedValue(createdFood);
    mocks.invalidateQueries.mockResolvedValue(undefined);
    await render(<NewFoodScreen />);

    await act(async () => {
      await screen.getByTestId('food-form').props.onSubmit({
        isFavorite: false,
        name: 'Oats',
        nutritionFacts: { caloriesKcal: 150, micronutrients: {} },
        servingSize: { amount: 40, unit: 'g' },
      });
    });

    expect(mocks.ensureQueryData).not.toHaveBeenCalled();
    expect(mocks.createFood).toHaveBeenCalledWith({
      isFavorite: false,
      name: 'Oats',
      nutritionFacts: { caloriesKcal: 150, micronutrients: {} },
      servingSize: { amount: 40, unit: 'g' },
    });
  });

  it('shows an error and remains on the form after atomic creation fails', async () => {
    mocks.ensureQueryData.mockResolvedValue([proteinTag, fiberTag]);
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
