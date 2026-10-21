import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    background: 'background',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import { PlaceholderScreen } from '../PlaceholderScreen.js';

describe('Placeholder screen', () => {
  it('renders its supplied title and description', async () => {
    await render(
      <PlaceholderScreen
        description="Placeholder description"
        title="Placeholder title"
      />,
    );

    const title = screen.getByTestId('placeholder-screen-title');
    expect(title).toBeTruthy();
    expect(title).toHaveTextContent('Placeholder title');
    const description = screen.getByTestId('placeholder-screen-description');
    expect(description).toBeTruthy();
    expect(description).toHaveTextContent('Placeholder description');
  });
});
