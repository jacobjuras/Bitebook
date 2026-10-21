import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    background: 'background',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import ReportsScreen from '../../../app/(tabs)/reports.js';

describe('Reports route', () => {
  it('renders the Reports placeholder copy', async () => {
    await render(<ReportsScreen />);

    expect(screen.getByTestId('placeholder-screen-title')).toHaveTextContent('Reports');
    expect(screen.getByTestId('placeholder-screen-description')).toHaveTextContent(
      'Understand your eating patterns.',
    );
  });
});
