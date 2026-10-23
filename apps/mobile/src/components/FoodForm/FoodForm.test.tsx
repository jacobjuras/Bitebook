import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Ionicons' }));
vi.mock('@expo/ui/community/menu', async () => {
  const { createElement } = await vi.importActual<typeof import('react')>('react');
  return {
    MenuView: ({ actions, children, ...props }: {
      actions: unknown[];
      children: ReactNode;
      testID?: string;
    }) => createElement('MenuView', { ...props, actions }, children),
  };
});
vi.mock('~/theme', () => ({
  useThemeColors: () => ({
    accent: 'accent',
    accentSubtle: 'accent-subtle',
    background: 'background',
    border: 'border',
    control: 'control',
    danger: 'danger',
    dangerSubtle: 'danger-subtle',
    onAccent: 'on-accent',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import { FoodForm } from './FoodForm.js';

describe('FoodForm', () => {
  it('rejects blank and invalid required values', async () => {
    const onSubmit = vi.fn();
    await render(<FoodForm isSubmitting={false} onSubmit={onSubmit} />);
    expect(screen.getByTestId('food-form-title')).toHaveTextContent('Add food');

    expect(screen.getByTestId('food-form-scroll-view').props)
      .toMatchObject({ contentInsetAdjustmentBehavior: 'automatic' });
    expect(screen.getByTestId('food-form-name-input').props).toMatchObject({
      accessibilityLabel: 'Food name, required',
      placeholder: 'Food name',
    });
    expect(
      screen.getByTestId('food-form-serving-amount-input').props,
    ).toMatchObject({
      accessibilityLabel: 'Serving amount, required',
      placeholder: 'Amount',
    });
    expect(screen.getByTestId('food-form-calories-input').props).toMatchObject({
      accessibilityLabel: 'Calories, required',
      placeholder: 'Calories',
    });
    expect(screen.getByTestId('food-form-serving-unit-menu').props.actions)
      .toEqual([
        { id: 'g', title: 'g' },
        { id: 'kg', title: 'kg' },
        { id: 'oz', title: 'oz' },
        { id: 'lb', title: 'lb' },
        { id: 'ml', title: 'mL' },
        { id: 'l', title: 'L' },
        { id: 'tsp', title: 'tsp' },
        { id: 'tbsp', title: 'tbsp' },
        { id: 'cup', title: 'cup' },
        { id: 'flOz', title: 'fl oz' },
        { id: 'item', title: 'item' },
      ]);
    expect(screen.getByTestId('food-form-serving-unit-button').props)
      .toMatchObject({ accessibilityLabel: 'Serving unit, g' });
    expect(screen.getByTestId('food-form-show-tag-input-button').props)
      .toMatchObject({ accessibilityLabel: 'Add optional tag' });
    expect(screen.queryByTestId('food-form-tag-input')).toBeNull();
    await fireEvent.press(screen.getByTestId('food-form-save-button'));

    expect(screen.getByTestId('food-form-nutrition-heading'))
      .toHaveTextContent('NUTRITION');
    expect(screen.getByTestId('food-form-favorite-label'))
      .toHaveTextContent('Add to favorites');
    expect(screen.getByTestId('food-form-favorite-switch').props)
      .toMatchObject({ accessibilityLabel: 'Add Food to favorites' });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('food-form-error')).toHaveTextContent(
      'Enter a name, positive serving size, and valid calories',
    );
  });

  it('submits normalized basics, organization, and optional nutrition', async () => {
    const onSubmit = vi.fn();
    await render(<FoodForm isSubmitting={false} onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('food-form-name-input'), '  Oats  ');
    await fireEvent.changeText(screen.getByTestId('food-form-serving-amount-input'), '40');
    await fireEvent(
      screen.getByTestId('food-form-serving-unit-menu'),
      'pressAction',
      { nativeEvent: { event: 'oz' } },
    );
    await fireEvent.changeText(screen.getByTestId('food-form-calories-input'), '150');
    await fireEvent.press(screen.getByTestId('food-form-more-nutrition-button'));
    expect(screen.getByTestId('food-form-optional-nutrition')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('food-form-proteinG-input'), '6');
    await fireEvent.changeText(screen.getByTestId('food-form-sodium-input'), '120');
    await fireEvent.press(screen.getByTestId('food-form-show-tag-input-button'));
    await fireEvent.changeText(screen.getByTestId('food-form-tag-input'), ' Breakfast ');
    await fireEvent.press(screen.getByTestId('food-form-add-tag-button'));
    await fireEvent(screen.getByTestId('food-form-favorite-switch'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('food-form-save-button'));

    expect(onSubmit).toHaveBeenCalledWith({
      isFavorite: true,
      name: 'Oats',
      nutritionFacts: {
        caloriesKcal: 150,
        micronutrients: { sodium: { amount: 120, unit: 'mg' } },
        proteinG: 6,
      },
      servingSize: { amount: 40, unit: 'oz' },
      tags: ['breakfast'],
    });
  });

  it('cancels tag entry without adding a tag', async () => {
    await render(<FoodForm isSubmitting={false} onSubmit={vi.fn()} />);

    await fireEvent.press(screen.getByTestId('food-form-show-tag-input-button'));
    expect(screen.getByTestId('food-form-tag-input').props.autoFocus).toBe(true);
    await fireEvent.changeText(screen.getByTestId('food-form-tag-input'), 'draft');
    expect(screen.getByTestId('food-form-tag-editor')).toBeTruthy();
    expect(screen.queryByTestId('food-form-show-tag-input-button')).toBeNull();

    await fireEvent.press(screen.getByTestId('food-form-cancel-tag-button'));

    expect(screen.queryByTestId('food-form-tag-editor')).toBeNull();
    expect(screen.queryByTestId('food-form-tag-input')).toBeNull();
    expect(screen.getByTestId('food-form-show-tag-input-button')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('food-form-show-tag-input-button'));
    expect(screen.getByTestId('food-form-tag-input').props.value).toBe('');
  });

  it('normalizes, deduplicates, and removes tags', async () => {
    await render(<FoodForm isSubmitting={false} onSubmit={vi.fn()} />);
    await fireEvent.press(screen.getByTestId('food-form-show-tag-input-button'));
    const tagInput = screen.getByTestId('food-form-tag-input');

    await fireEvent.changeText(tagInput, ' HIGH-PROTEIN ');
    await fireEvent.press(screen.getByTestId('food-form-add-tag-button'));
    expect(screen.getByTestId('food-form-tag-high-protein')).toBeTruthy();
    expect(screen.queryByTestId('food-form-tag-input')).toBeNull();

    await fireEvent.press(screen.getByTestId('food-form-show-tag-input-button'));
    await fireEvent.changeText(
      screen.getByTestId('food-form-tag-input'),
      'high-protein',
    );
    await fireEvent.press(screen.getByTestId('food-form-add-tag-button'));
    expect(screen.getAllByTestId('food-form-tag-high-protein')).toHaveLength(1);

    await fireEvent.press(screen.getByTestId('food-form-tag-high-protein'));
    expect(screen.queryByTestId('food-form-tag-high-protein')).toBeNull();
  });

  it('rejects the reserved favorite tag and negative optional nutrition', async () => {
    const onSubmit = vi.fn();
    await render(<FoodForm isSubmitting={false} onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByTestId('food-form-show-tag-input-button'));
    await fireEvent.changeText(screen.getByTestId('food-form-tag-input'), 'favorite');
    await fireEvent.press(screen.getByTestId('food-form-add-tag-button'));
    expect(screen.getByTestId('food-form-tag-error')).toHaveTextContent(
      'Favorite is reserved for the favorite toggle',
    );

    await fireEvent.changeText(screen.getByTestId('food-form-name-input'), 'Oats');
    await fireEvent.changeText(screen.getByTestId('food-form-serving-amount-input'), '1');
    await fireEvent.changeText(screen.getByTestId('food-form-calories-input'), '100');
    await fireEvent.press(screen.getByTestId('food-form-more-nutrition-button'));
    await fireEvent.changeText(screen.getByTestId('food-form-fatG-input'), '-1');
    await fireEvent.press(screen.getByTestId('food-form-save-button'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('food-form-error')).toHaveTextContent(
      'Nutrition values must be zero or greater',
    );
  });

  it('disables saving and displays progress while submitting', async () => {
    await render(<FoodForm isSubmitting onSubmit={vi.fn()} />);

    expect(screen.getByTestId('food-form-save-button').props.accessibilityState)
      .toEqual({ disabled: true });
    expect(screen.getByTestId('food-form-saving-indicator')).toBeTruthy();
  });
});
