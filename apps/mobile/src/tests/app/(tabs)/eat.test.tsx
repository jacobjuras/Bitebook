import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('~/theme', () => ({
  useThemeColors: () => ({
    background: 'background',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import EatScreen from '../../../app/(tabs)/eat.js';

describe('Eat route', () => {
  it('renders the Eat placeholder copy', async () => {
    await render(<EatScreen />);

    expect(screen.getByTestId('placeholder-screen-title')).toHaveTextContent('Eat');
    expect(screen.getByTestId('placeholder-screen-description')).toHaveTextContent(
      'Log a food or meal.',
    );
  });
});
