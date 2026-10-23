import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('~/theme', () => ({
  useThemeColors: () => ({ accent: 'accent' }),
}));

import { ClearAllButton } from './ClearAllButton.js';

describe('ClearAllButton', () => {
  it('renders its accessible action and clears the caller selection', async () => {
    const onPress = vi.fn();
    await render(
      <ClearAllButton
        accessibilityLabel="Clear all selections"
        onPress={onPress}
        testID="clear-all-button"
      />,
    );

    const button = screen.getByTestId('clear-all-button');
    expect(button.props).toMatchObject({
      accessibilityLabel: 'Clear all selections',
      accessibilityRole: 'button',
    });
    expect(button).toHaveTextContent('Clear all');
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledOnce();
  });
});
