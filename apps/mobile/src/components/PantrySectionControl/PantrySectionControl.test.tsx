import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    control: 'control',
    controlSelected: 'control-selected',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import { PantrySection } from '../../constants/pantry-constants.js';
import { PantrySectionControl } from './PantrySectionControl.js';

function ControlledPantrySectionControl() {
  const [selectedSection, setSelectedSection] = useState(PantrySection.Foods);

  return (
    <PantrySectionControl
      onSelect={setSelectedSection}
      selectedSection={selectedSection}
      testIDPrefix="pantry"
    />
  );
}

describe('PantrySectionControl', () => {
  it.each([
    [PantrySection.Foods, true, false],
    [PantrySection.Meals, false, true],
  ])(
    'renders the %s selection',
    async (selectedSection, foodsSelected, mealsSelected) => {
      await render(
        <PantrySectionControl
          onSelect={vi.fn()}
          selectedSection={selectedSection}
          testIDPrefix="pantry"
        />,
      );

      const foodsTab = screen.getByTestId('pantry-foods-tab');
      const mealsTab = screen.getByTestId('pantry-meals-tab');
      expect(foodsTab).toHaveTextContent('Foods');
      expect(mealsTab).toHaveTextContent('Meals');
      expect(foodsTab.props.accessibilityRole).toBe('tab');
      expect(mealsTab.props.accessibilityRole).toBe('tab');
      expect(foodsTab.props.accessibilityState).toEqual({
        selected: foodsSelected,
      });
      expect(mealsTab.props.accessibilityState).toEqual({
        selected: mealsSelected,
      });
      expect(StyleSheet.flatten(
        screen.getByTestId('pantry-section-control').props.style,
      )).toMatchObject({
        backgroundColor: 'control',
        borderRadius: 10,
        flexDirection: 'row',
        marginHorizontal: 24,
        padding: 3,
      });
      expect(StyleSheet.flatten(
        screen.getByTestId(`pantry-${selectedSection}-tab`).props.style,
      )).toMatchObject({ backgroundColor: 'control-selected' });
    },
  );

  it('switches to the other section when its tab is pressed', async () => {
    await render(<ControlledPantrySectionControl />);

    expect(screen.getByTestId('pantry-foods-tab').props.accessibilityState)
      .toEqual({ selected: true });
    expect(screen.getByTestId('pantry-meals-tab').props.accessibilityState)
      .toEqual({ selected: false });

    await fireEvent.press(screen.getByTestId('pantry-meals-tab'));

    expect(screen.getByTestId('pantry-foods-tab').props.accessibilityState)
      .toEqual({ selected: false });
    expect(screen.getByTestId('pantry-meals-tab').props.accessibilityState)
      .toEqual({ selected: true });
  });
});
