import { createElement, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStatus } from '../../auth/AuthStatus.js';

const mocks = vi.hoisted(() => ({
  clear: vi.fn(),
  listFoods: vi.fn(),
  listMeals: vi.fn(),
  query: vi.fn(() => Promise.resolve()),
  status: 'loading',
}));

vi.mock('@tanstack/react-query', async () => {
  const { createElement } = await vi.importActual<typeof import('react')>('react');
  return {
    QueryClientProvider: ({ children }: { children: ReactNode }) =>
      createElement('QueryClientProvider', { testID: 'root-query-provider' }, children),
  };
});
vi.mock('expo-router', async () => {
  const { createElement, isValidElement } = await vi.importActual<typeof import('react')>('react');
  const Stack = Object.assign(
    ({ children, ...props }: { children: ReactNode }) =>
      createElement('Stack', { ...props, testID: 'root-route-stack' }, children),
    {
      Protected: ({ children, ...props }: { children: ReactNode; guard: boolean }) => {
        const routeName = isValidElement<{ name: string }>(children)
          ? children.props.name
          : 'unknown';
        return createElement(
          'Stack.Protected',
          { ...props, testID: `root-${routeName}-guard` },
          children,
        );
      },
      Screen: ({ name, ...props }: { name: string }) => createElement(
        'Stack.Screen',
        { ...props, name, testID: `root-${name}-screen` },
      ),
    },
  );
  return { Stack };
});
vi.mock('expo-status-bar', async () => {
  const { createElement } = await vi.importActual<typeof import('react')>('react');
  return {
    StatusBar: (props: Record<string, unknown>) => createElement(
      'StatusBar',
      { ...props, testID: 'root-status-bar' },
    ),
  };
});
vi.mock('../../query/pantryQueries.js', () => ({
  foodsQueryOptions: {
    queryFn: mocks.listFoods,
    queryKey: ['foods'],
    staleTime: Infinity,
  },
  mealsQueryOptions: {
    queryFn: mocks.listMeals,
    queryKey: ['meals'],
    staleTime: Infinity,
  },
}));
vi.mock('../../auth/AuthProvider.js', async () => {
  const { createElement } = await vi.importActual<typeof import('react')>('react');
  return {
    AuthProvider: ({ children }: { children: ReactNode }) =>
      createElement('AuthProvider', { testID: 'root-auth-provider' }, children),
    useAuth: () => ({ status: mocks.status }),
  };
});
vi.mock('../../query/queryClient.js', () => ({
  queryClient: {
    clear: mocks.clear,
    query: mocks.query,
  },
}));

import RootLayout from '../../app/_layout.js';

async function renderRootLayout(status: AuthStatus) {
  mocks.status = status;
  await render(createElement(RootLayout));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue(undefined);
});

describe('root layout', () => {
  it('nests authentication and routes inside the query provider', async () => {
    await renderRootLayout(AuthStatus.Loading);

    expect(screen.getByTestId('root-query-provider')).toBeTruthy();
    expect(screen.getByTestId('root-auth-provider')).toBeTruthy();
    expect(screen.getByTestId('root-route-stack').props.screenOptions).toEqual({
      headerShown: false,
    });
    expect(screen.getByTestId('root-status-bar').props.style).toBe('auto');
  });

  it.each([
    [AuthStatus.Loading, true, false, 0, 0],
    [AuthStatus.NewPasswordRequired, true, false, 0, 0],
    [AuthStatus.SignedOut, true, false, 1, 0],
    [AuthStatus.SignedIn, false, true, 0, 2],
  ])(
    'configures guarded routes for %s',
    async (status, signedOutGuard, signedInGuard, clearCalls, preloadCalls) => {
      await renderRootLayout(status);

      expect(screen.getByTestId('root-sign-in-guard').props.guard).toBe(
        signedOutGuard,
      );
      expect(screen.getByTestId('root-(tabs)-guard').props.guard).toBe(
        signedInGuard,
      );
      expect(screen.getByTestId('root-sign-in-screen').props.options).toEqual({
        animation: 'fade',
      });
      expect(screen.getByTestId('root-(tabs)-screen').props.options).toEqual({
        animation: 'fade',
      });
      expect(mocks.clear).toHaveBeenCalledTimes(clearCalls);
      expect(mocks.query).toHaveBeenCalledTimes(preloadCalls);
    },
  );

  it('prefetches Pantry data after authentication succeeds', async () => {
    await renderRootLayout(AuthStatus.SignedIn);

    expect(mocks.query).toHaveBeenNthCalledWith(1, {
      queryFn: mocks.listFoods,
      queryKey: ['foods'],
      staleTime: Infinity,
    });
    expect(mocks.query).toHaveBeenNthCalledWith(2, {
      queryFn: mocks.listMeals,
      queryKey: ['meals'],
      staleTime: Infinity,
    });
  });

  it('keeps authenticated routes available when startup loading fails', async () => {
    mocks.query.mockRejectedValue(new Error('network unavailable'));

    await renderRootLayout(AuthStatus.SignedIn);

    expect(screen.getByTestId('root-(tabs)-guard').props.guard).toBe(true);
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });
});
