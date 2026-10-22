import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Ionicons' }));
vi.mock('~/theme', () => ({
  useThemeColors: () => ({ accent: 'accent' }),
}));

import { FavoriteIndicator } from './FavoriteIndicator.js';

describe('FavoriteIndicator', () => {
  it('renders an accessible filled-star indicator', async () => {
    await render(<FavoriteIndicator testIDPrefix="item-123" />);

    const indicator = screen.getByTestId('item-123-favorite-indicator');
    expect(indicator.props.accessibilityLabel).toBe('Favorite');
    expect(indicator.props.accessibilityRole).toBe('image');
    expect(indicator.props.onPress).toBeUndefined();
    expect(screen.getByTestId('item-123-favorite-icon').props).toMatchObject({
      accessible: false,
      color: 'accent',
      name: 'star',
      size: 22,
    });
  });
});
