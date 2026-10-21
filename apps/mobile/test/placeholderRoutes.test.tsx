import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    background: 'background',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import CalendarScreen from '../src/app/(tabs)/index.js';
import EatScreen from '../src/app/(tabs)/eat.js';
import NewFoodScreen from '../src/app/(tabs)/pantry/food/new.js';
import NewMealScreen from '../src/app/(tabs)/pantry/meal/new.js';
import ReportsScreen from '../src/app/(tabs)/reports.js';

describe.each([
  [CalendarScreen, 'Calendar', 'Plan and review your meals.'],
  [EatScreen, 'Eat', 'Log a food or meal.'],
  [ReportsScreen, 'Reports', 'Understand your eating patterns.'],
  [NewFoodScreen, 'Add food', 'Enter food details here.'],
  [NewMealScreen, 'Create meal', 'Choose foods and quantities for this saved meal.'],
])('%s', (Screen, title, description) => {
  it('renders the route copy', async () => {
    await render(<Screen />);

    expect(screen.getByTestId('placeholder-screen-title')).toHaveTextContent(title);
    expect(screen.getByTestId('placeholder-screen-description')).toHaveTextContent(
      description,
    );
  });
});
