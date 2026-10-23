import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Keyboard, StyleSheet } from 'react-native';
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
import { tagFixtures } from '~/tests/fixtures/tags';

describe('FoodForm', () => {
  it('rejects blank and invalid required values', async () => {
    const onSubmit = vi.fn();
    await render(<FoodForm availableTags={[]} isSubmitting={false} onSubmit={onSubmit} />);
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
    expect(screen.getByTestId('food-form-tag-heading')).toHaveTextContent('TAGS');
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
    await render(<FoodForm availableTags={[]} isSubmitting={false} onSubmit={onSubmit} />);

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
      newTags: [{ name: 'Breakfast' }],
      nutritionFacts: {
        caloriesKcal: 150,
        micronutrients: { sodium: { amount: 120, unit: 'mg' } },
        proteinG: 6,
      },
      servingSize: { amount: 40, unit: 'oz' },
    });
  });

  it('cancels tag entry without adding a tag', async () => {
    await render(<FoodForm availableTags={[]} isSubmitting={false} onSubmit={vi.fn()} />);

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

  it('renders staged new Tags with a dashed border', async () => {
    await render(<FoodForm availableTags={[]} isSubmitting={false} onSubmit={vi.fn()} />);
    await fireEvent.press(screen.getByTestId('food-form-show-tag-input-button'));
    await fireEvent.changeText(screen.getByTestId('food-form-tag-input'), ' HIGH-PROTEIN ');
    await fireEvent.press(screen.getByTestId('food-form-add-tag-button'));

    expect(StyleSheet.flatten(
      screen.getByTestId('food-form-new-tag-high-protein').props.style,
    )).toMatchObject({ borderStyle: 'dashed', borderWidth: 1 });
    expect(screen.queryByTestId('food-form-tag-input')).toBeNull();

    await fireEvent.press(screen.getByTestId('food-form-show-tag-input-button'));
    await fireEvent.changeText(screen.getByTestId('food-form-tag-input'), 'high-protein');
    await fireEvent.press(screen.getByTestId('food-form-add-tag-button'));
    expect(screen.getByTestId('food-form-tag-error')).toHaveTextContent('Tag already added');

    await fireEvent.press(screen.getByTestId('food-form-new-tag-high-protein'));
    expect(screen.queryByTestId('food-form-new-tag-high-protein')).toBeNull();
  });

  it('suggests matching existing Tags and rejects creating a duplicate name', async () => {
    const dismissKeyboard = vi.spyOn(Keyboard, 'dismiss');
    const { fiber, protein } = tagFixtures;
    const onSubmit = vi.fn();
    await render(
      <FoodForm
        availableTags={[fiber, protein]}
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );

    await fireEvent.press(screen.getByTestId('food-form-show-tag-input-button'));
    await fireEvent.changeText(screen.getByTestId('food-form-tag-input'), 'PRO');

    expect(screen.getByTestId(`food-form-available-tag-${protein.id}`)).toBeTruthy();
    expect(screen.queryByTestId(`food-form-available-tag-${fiber.id}`)).toBeNull();

    await fireEvent.changeText(screen.getByTestId('food-form-tag-input'), 'missing');
    expect(screen.getByTestId(`food-form-available-tag-${protein.id}`)).toBeTruthy();
    expect(screen.getByTestId(`food-form-available-tag-${fiber.id}`)).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('food-form-tag-input'), ' Protein ');
    await fireEvent.press(screen.getByTestId('food-form-add-tag-button'));
    expect(dismissKeyboard).toHaveBeenCalledOnce();
    dismissKeyboard.mockRestore();
    expect(screen.getByTestId('food-form-tag-error')).toHaveTextContent(
      'This tag already exists. Select it above.',
    );
    expect(StyleSheet.flatten(
      screen.getByTestId('food-form-tag-input-container').props.style,
    )).toMatchObject({ borderColor: 'danger' });

    await fireEvent.press(screen.getByTestId(`food-form-available-tag-${protein.id}`));
    expect(StyleSheet.flatten(
      screen.getByTestId(`food-form-selected-tag-${protein.id}`).props.style,
    )).toMatchObject({ backgroundColor: 'accent-subtle' });
    expect(screen.queryByTestId('food-form-tag-editor')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('food-form-name-input'), 'Oats');
    await fireEvent.changeText(screen.getByTestId('food-form-serving-amount-input'), '40');
    await fireEvent.changeText(screen.getByTestId('food-form-calories-input'), '150');
    await fireEvent.press(screen.getByTestId('food-form-save-button'));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      newTags: undefined,
      tagIds: [protein.id],
    }));
  });

  it('clears selected existing and staged new Tags together', async () => {
    const { protein } = tagFixtures;
    await render(
      <FoodForm availableTags={[protein]} isSubmitting={false} onSubmit={vi.fn()} />,
    );

    await fireEvent.press(screen.getByTestId(`food-form-available-tag-${protein.id}`));
    await fireEvent.press(screen.getByTestId('food-form-show-tag-input-button'));
    await fireEvent.changeText(screen.getByTestId('food-form-tag-input'), 'quick');
    await fireEvent.press(screen.getByTestId('food-form-add-tag-button'));
    expect(screen.getByTestId(`food-form-selected-tag-${protein.id}`)).toBeTruthy();
    expect(screen.getByTestId('food-form-new-tag-quick')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('food-form-clear-tags-button'));

    expect(screen.queryByTestId(`food-form-selected-tag-${protein.id}`)).toBeNull();
    expect(screen.queryByTestId('food-form-new-tag-quick')).toBeNull();
    expect(screen.queryByTestId('food-form-clear-tags-button')).toBeNull();
    expect(screen.getByTestId(`food-form-available-tag-${protein.id}`)).toBeTruthy();
  });

  it('rejects the reserved favorite tag and negative optional nutrition', async () => {
    const onSubmit = vi.fn();
    await render(<FoodForm availableTags={[]} isSubmitting={false} onSubmit={onSubmit} />);

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

  it('does not open Tag entry after ten Tags have been added', async () => {
    await render(<FoodForm availableTags={[]} isSubmitting={false} onSubmit={vi.fn()} />);

    for (let index = 0; index < 10; index += 1) {
      await fireEvent.press(screen.getByTestId('food-form-show-tag-input-button'));
      await fireEvent.changeText(screen.getByTestId('food-form-tag-input'), `tag-${index}`);
      await fireEvent.press(screen.getByTestId('food-form-add-tag-button'));
    }
    await fireEvent.press(screen.getByTestId('food-form-show-tag-input-button'));

    expect(screen.queryByTestId('food-form-tag-editor')).toBeNull();
    expect(screen.getByTestId('food-form-tag-error'))
      .toHaveTextContent('Foods can have up to 10 tags');
  });

  it('disables saving and displays progress while submitting', async () => {
    await render(<FoodForm availableTags={[]} isSubmitting onSubmit={vi.fn()} />);

    expect(screen.getByTestId('food-form-save-button').props.accessibilityState)
      .toEqual({ disabled: true });
    expect(screen.getByTestId('food-form-saving-indicator')).toBeTruthy();
  });
});
