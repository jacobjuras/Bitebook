import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Ionicons' }));
vi.mock('../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    accent: 'accent',
    accentSubtle: 'accent-subtle',
    control: 'control',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import {
  type ContentState,
  ContentStateKind,
  ContentStateView,
} from '../ContentStateView.js';

describe('ContentStateView', () => {
  it('renders a centered loading indicator', async () => {
    await render(
      <ContentStateView
        state={{ kind: ContentStateKind.Loading }}
        testIDPrefix="items"
      />,
    );

    const indicator = screen.getByTestId('items-loading-indicator');
    expect(indicator.props.color).toBe('accent');
    expect(StyleSheet.flatten(indicator.props.style)).toMatchObject({
      flex: 1,
      justifyContent: 'center',
    });
  });

  it('renders an error and invokes its retry action', async () => {
    const onRetry = vi.fn();
    await render(
      <ContentStateView
        state={{
          kind: ContentStateKind.Error,
          message: 'Unable to load items',
          onRetry,
        }}
        testIDPrefix="items"
      />,
    );

    expect(screen.getByTestId('items-error-message')).toHaveTextContent(
      'Unable to load items',
    );
    const retryButton = screen.getByTestId('items-retry-button');
    expect(retryButton.props.accessibilityRole).toBe('button');
    expect(retryButton).toHaveTextContent('Try again');

    await fireEvent.press(retryButton);

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders an initial-empty state with its icon and guidance', async () => {
    await render(
      <ContentStateView
        state={{
          description: 'Add an item to get started',
          icon: 'nutrition-outline',
          kind: ContentStateKind.Empty,
          title: 'No items yet',
        }}
        testIDPrefix="items"
      />,
    );

    expect(screen.getByTestId('items-empty-title')).toHaveTextContent(
      'No items yet',
    );
    expect(screen.getByTestId('items-empty-description')).toHaveTextContent(
      'Add an item to get started',
    );
    expect(screen.getByTestId('items-empty-icon').props.name).toBe(
      'nutrition-outline',
    );
  });

  it('renders no-results guidance without empty-state actions', async () => {
    await render(
      <ContentStateView
        state={{
          description: 'Try a different search or filter',
          kind: ContentStateKind.NoResults,
          title: 'No items found',
        }}
        testIDPrefix="items"
      />,
    );

    expect(screen.getByTestId('items-no-results-title')).toHaveTextContent(
      'No items found',
    );
    expect(screen.getByTestId('items-no-results-description')).toHaveTextContent(
      'Try a different search or filter',
    );
    expect(screen.queryByTestId('items-retry-button')).toBeNull();
    expect(screen.queryByTestId('items-empty-icon')).toBeNull();
  });

  it('rejects an unsupported content state', async () => {
    const unsupportedState = { kind: 'unsupported' } as unknown as ContentState;

    await expect(render(
      <ContentStateView state={unsupportedState} testIDPrefix="items" />,
    )).rejects.toThrow('Unsupported content state');
  });
});
