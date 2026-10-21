import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  appStateListener: undefined as ((state: string) => void) | undefined,
  cleanup: undefined as (() => void) | undefined,
  remove: vi.fn(),
  setFocused: vi.fn(),
  setEventListener: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  focusManager: {
    setEventListener: mocks.setEventListener.mockImplementation((listener) => {
      mocks.cleanup = listener(mocks.setFocused);
    }),
  },
  QueryClient: class QueryClient {},
}));
vi.mock('react-native', () => ({
  AppState: {
    addEventListener: mocks.addEventListener.mockImplementation((_event, listener) => {
      mocks.appStateListener = listener;
      return { remove: mocks.remove };
    }),
  },
}));

import { queryClient } from '../queryClient.js';

describe('query client', () => {
  beforeEach(() => {
    mocks.remove.mockClear();
    mocks.setFocused.mockClear();
  });

  it('creates the shared QueryClient', () => {
    expect(queryClient.constructor.name).toBe('QueryClient');
  });

  it('reports whether the app is active to TanStack Query', () => {
    expect(mocks.appStateListener).toBeTypeOf('function');

    mocks.appStateListener?.('background');
    mocks.appStateListener?.('active');

    expect(mocks.setFocused).toHaveBeenNthCalledWith(1, false);
    expect(mocks.setFocused).toHaveBeenNthCalledWith(2, true);
  });

  it('removes the app-state listener during cleanup', () => {
    mocks.cleanup?.();

    expect(mocks.remove).toHaveBeenCalledOnce();
  });
});
