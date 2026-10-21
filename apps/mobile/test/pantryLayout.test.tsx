import { createElement, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-router', () => {
  const Stack = Object.assign(
    ({ children }: { children: ReactNode }) =>
      createElement('Stack', { testID: 'pantry-stack' }, children),
    {
      Screen: ({ name, ...props }: { name: string }) =>
        createElement('Stack.Screen', {
          ...props,
          name,
          testID: `pantry-route-${name}`,
        }),
    },
  );
  return { Stack };
});

import PantryLayout from '../src/app/(tabs)/pantry/_layout.js';

describe('Pantry layout', () => {
  it('configures the Pantry index and creation routes', async () => {
    await render(<PantryLayout />);

    expect(screen.getByTestId('pantry-stack')).toBeTruthy();
    expect(screen.getByTestId('pantry-route-index').props.options).toEqual({
      headerShown: false,
    });
    expect(screen.getByTestId('pantry-route-food/new').props.options).toEqual({
      headerBackTitle: 'Pantry',
      title: 'Add food',
    });
    expect(screen.getByTestId('pantry-route-meal/new').props.options).toEqual({
      headerBackTitle: 'Pantry',
      title: 'Create meal',
    });
  });
});
