import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    background: 'background',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import NewFoodScreen from '../../../../../app/(tabs)/pantry/food/new.js';

describe('New Food route', () => {
  it('renders the Food creation placeholder copy', async () => {
    await render(<NewFoodScreen />);

    expect(screen.getByTestId('placeholder-screen-title')).toHaveTextContent('Add food');
    expect(screen.getByTestId('placeholder-screen-description')).toHaveTextContent(
      'Enter food details here.',
    );
  });
});
