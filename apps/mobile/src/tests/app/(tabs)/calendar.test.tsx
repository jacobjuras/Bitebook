import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    background: 'background',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import CalendarScreen from '../../../app/(tabs)/calendar.js';

describe('Calendar route', () => {
  it('renders the Calendar placeholder copy', async () => {
    await render(<CalendarScreen />);

    expect(screen.getByTestId('placeholder-screen-title')).toHaveTextContent('Calendar');
    expect(screen.getByTestId('placeholder-screen-description')).toHaveTextContent(
      'Plan and review your meals.',
    );
  });
});
