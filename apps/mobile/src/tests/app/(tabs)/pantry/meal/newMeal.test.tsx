import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    background: 'background',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import NewMealScreen from '../../../../../app/(tabs)/pantry/meal/newMeal.js';

describe('New Meal route', () => {
  it('renders the Meal creation placeholder copy', async () => {
    await render(<NewMealScreen />);

    expect(screen.getByTestId('placeholder-screen-title')).toHaveTextContent('Create meal');
    expect(screen.getByTestId('placeholder-screen-description')).toHaveTextContent(
      'Choose foods and quantities for this saved meal.',
    );
  });
});
