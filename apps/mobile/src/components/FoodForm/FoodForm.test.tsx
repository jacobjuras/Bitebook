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
    accent: 'accent', accentSubtle: 'accent-subtle', background: 'background',
    border: 'border', control: 'control', danger: 'danger',
    dangerSubtle: 'danger-subtle', onAccent: 'on-accent',
    textPrimary: 'text-primary', textSecondary: 'text-secondary',
  }),
}));

import { FoodForm } from './FoodForm.js';

async function renderForm(onSubmit = vi.fn(), isSubmitting = false) {
  await render(
    <FoodForm availableTags={[]} isSubmitting={isSubmitting} onSubmit={onSubmit} />,
  );
  return onSubmit;
}

async function enterRequiredFields() {
  await fireEvent.changeText(screen.getByTestId('food-form-name-input'), '  Oats  ');
  await fireEvent.changeText(screen.getByTestId('food-form-serving-amount-input'), '40');
  await fireEvent.changeText(screen.getByTestId('food-form-calories-input'), '150');
}

describe('FoodForm', () => {
  it('renders its required fields and rejects invalid required values', async () => {
    const onSubmit = await renderForm();

    expect(screen.getByTestId('food-form-title')).toHaveTextContent('Add food');
    expect(screen.getByTestId('food-form-scroll-view').props)
      .toMatchObject({ contentInsetAdjustmentBehavior: 'automatic' });
    expect(screen.getByTestId('food-form-name-input').props).toMatchObject({
      accessibilityLabel: 'Food name, required',
      onSubmitEditing: expect.any(Function),
      returnKeyType: 'next',
      submitBehavior: 'submit',
    });
    expect(screen.getByTestId('food-form-serving-amount-input').props)
      .toMatchObject({ accessibilityLabel: 'Serving amount, required' });
    expect(screen.getByTestId('food-form-calories-input').props)
      .toMatchObject({ accessibilityLabel: 'Calories, required' });
    expect(screen.getByTestId('food-form-nutrition-heading'))
      .toHaveTextContent('NUTRITION');
    expect(screen.getByTestId('food-form-tag-heading')).toHaveTextContent('TAGS');

    await fireEvent.press(screen.getByTestId('food-form-save-button'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('food-form-error')).toHaveTextContent(
      'Enter a name, positive serving size, and valid calories',
    );
  });

  it('normalizes the serving amount after editing', async () => {
    await renderForm();

    for (const [entered, displayed] of [
      ['00040', '40'],
      ['0', ''],
      ['000', ''],
      ['00.0', ''],
      ['00.5', '0.5'],
      ['0.5', '0.5'],
    ]) {
      await fireEvent.changeText(
        screen.getByTestId('food-form-serving-amount-input'),
        entered,
      );
      expect(screen.getByTestId('food-form-serving-amount-input').props.value)
        .toBe(entered);

      await fireEvent(
        screen.getByTestId('food-form-serving-amount-input'),
        'blur',
      );
      expect(screen.getByTestId('food-form-serving-amount-input').props.value)
        .toBe(displayed);
    }
  });

  it('submits normalized Food fields and the TagPicker value', async () => {
    const onSubmit = await renderForm();
    await enterRequiredFields();
    await fireEvent(
      screen.getByTestId('food-form-serving-unit-menu'),
      'pressAction',
      { nativeEvent: { event: 'oz' } },
    );
    await fireEvent.press(screen.getByTestId('food-form-more-nutrition-button'));
    await fireEvent.changeText(screen.getByTestId('food-form-proteinG-input'), '6');
    await fireEvent.changeText(screen.getByTestId('food-form-sodium-input'), '120');
    await fireEvent.press(screen.getByTestId('food-form-show-tag-input-button'));
    await fireEvent.changeText(screen.getByTestId('food-form-tag-input'), ' Breakfast ');
    await fireEvent(screen.getByTestId('food-form-tag-input'), 'submitEditing');
    await fireEvent(screen.getByTestId('food-form-favorite-switch'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('food-form-save-button'));

    expect(onSubmit).toHaveBeenCalledWith({
      isFavorite: true,
      name: 'Oats',
      newTags: [{ name: 'Breakfast' }],
      nutritionFacts: {
        caloriesKcal: 150,
        micronutrients: { sodium: { amount: 120, unit: 'mg' } },
        proteinG: 6,
      },
      servingSize: { amount: 40, unit: 'oz' },
      tagIds: undefined,
    });
  });

  it('rejects invalid optional nutrition', async () => {
    const onSubmit = await renderForm();
    await enterRequiredFields();
    await fireEvent.press(screen.getByTestId('food-form-more-nutrition-button'));
    await fireEvent.changeText(screen.getByTestId('food-form-fatG-input'), '-1');
    await fireEvent.press(screen.getByTestId('food-form-save-button'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('food-form-error'))
      .toHaveTextContent('Nutrition values must be zero or greater');
  });

  it('disables saving and displays progress while submitting', async () => {
    await renderForm(vi.fn(), true);
    expect(screen.getByTestId('food-form-save-button').props.accessibilityState)
      .toEqual({ disabled: true });
    expect(screen.getByTestId('food-form-saving-indicator')).toBeTruthy();
  });
});
