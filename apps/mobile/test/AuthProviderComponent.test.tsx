import type { PropsWithChildren } from 'react';
import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStatus } from '../src/auth/AuthStatus.js';

const mocks = vi.hoisted(() => ({
  configure: vi.fn(),
  confirmSignIn: vi.fn(),
  fetchAuthSession: vi.fn(),
  setAuthConfig: vi.fn(),
  setStorage: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('aws-amplify', () => ({
  Amplify: { configure: mocks.configure },
}));
vi.mock('aws-amplify/auth', () => ({
  confirmSignIn: mocks.confirmSignIn,
  fetchAuthSession: mocks.fetchAuthSession,
  signIn: mocks.signIn,
  signOut: mocks.signOut,
}));
vi.mock('aws-amplify/auth/cognito', () => ({
  cognitoUserPoolsTokenProvider: {
    setAuthConfig: mocks.setAuthConfig,
    setKeyValueStorage: mocks.setStorage,
  },
}));
vi.mock('../src/config/mobileConfig.js', () => ({
  getMobileConfig: () => ({
    userPoolClientId: 'client-id',
    userPoolId: 'us-west-2_pool',
  }),
}));
vi.mock('../src/auth/secureTokenStorage.js', () => ({
  secureTokenStorage: { storage: 'secure' },
}));

import { AuthProvider, useAuth } from '../src/auth/AuthProvider.js';

function AuthWrapper({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}

async function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthWrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.confirmSignIn.mockReset();
  mocks.fetchAuthSession.mockReset();
  mocks.signIn.mockReset();
  mocks.signOut.mockReset();
  mocks.fetchAuthSession.mockResolvedValue({});
  mocks.signOut.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('AuthProvider component', () => {
  it('restores a signed-in session when Amplify returns tokens', async () => {
    mocks.fetchAuthSession.mockResolvedValue({ tokens: { accessToken: 'token' } });

    const { result } = await renderAuth();

    await waitFor(() => expect(result.current.status).toBe(AuthStatus.SignedIn));
  });

  it('restores a signed-out session when Amplify returns no tokens', async () => {
    const { result } = await renderAuth();

    await waitFor(() => expect(result.current.status).toBe(AuthStatus.SignedOut));
  });

  it('fails closed when saved-session restoration fails', async () => {
    mocks.fetchAuthSession.mockRejectedValue(new Error('storage failed'));

    const { result } = await renderAuth();

    await waitFor(() => expect(result.current.status).toBe(AuthStatus.SignedOut));
    expect(result.current.error).toBe('Unable to restore the saved session');
  });

  it('moves to signed in after successful password authentication', async () => {
    mocks.signIn.mockResolvedValue({
      isSignedIn: true,
      nextStep: { signInStep: 'DONE' },
    });
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe(AuthStatus.SignedOut));

    await act(async () => result.current.signIn('user@example.com', 'password'));

    expect(result.current.status).toBe(AuthStatus.SignedIn);
  });

  it('returns to signed out with an error after failed password authentication', async () => {
    mocks.signIn.mockRejectedValue(new Error('bad credentials'));
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe(AuthStatus.SignedOut));

    await act(async () => result.current.signIn('user@example.com', 'password'));

    expect(result.current.status).toBe(AuthStatus.SignedOut);
    expect(result.current.error).toContain('Unable to sign in with those credentials');
  });

  it('moves to signed in after confirming a required password', async () => {
    mocks.confirmSignIn.mockResolvedValue({
      isSignedIn: true,
      nextStep: { signInStep: 'DONE' },
    });
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe(AuthStatus.SignedOut));

    await act(async () => result.current.confirmNewPassword('new-password'));

    expect(result.current.status).toBe(AuthStatus.SignedIn);
  });

  it('returns to the required-password state after confirmation fails', async () => {
    mocks.confirmSignIn.mockRejectedValue(new Error('password rejected'));
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe(AuthStatus.SignedOut));

    await act(async () => result.current.confirmNewPassword('new-password'));

    expect(result.current.status).toBe(AuthStatus.NewPasswordRequired);
    expect(result.current.error).toContain('Unable to set the new password');
  });

  it('moves to signed out after successful sign-out', async () => {
    mocks.fetchAuthSession.mockResolvedValue({ tokens: { accessToken: 'token' } });
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe(AuthStatus.SignedIn));

    await act(async () => result.current.signOut());

    expect(result.current.status).toBe(AuthStatus.SignedOut);
  });

  it('returns to signed in with an error after sign-out fails', async () => {
    mocks.fetchAuthSession.mockResolvedValue({ tokens: { accessToken: 'token' } });
    mocks.signOut.mockRejectedValue(new Error('sign-out failed'));
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe(AuthStatus.SignedIn));

    await act(async () => result.current.signOut());

    expect(result.current.status).toBe(AuthStatus.SignedIn);
    expect(result.current.error).toContain('Sign out failed');
  });

  it('rejects authentication consumers outside AuthProvider', async () => {
    await expect(renderHook(() => useAuth())).rejects.toThrow(
      'useAuth must be used within AuthProvider',
    );
  });
});
