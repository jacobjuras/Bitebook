import type { PropsWithChildren } from 'react';
import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react-native';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { SignInOutput } from 'aws-amplify/auth';

import { AuthStatus } from '../AuthStatus.js';

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
vi.mock('../../config/mobileConfig.js', () => ({
  getMobileConfig: () => ({
    userPoolClientId: 'client-id',
    userPoolId: 'us-west-2_pool',
  }),
}));
vi.mock('../secureTokenStorage.js', () => ({
  secureTokenStorage: { storage: 'secure' },
}));

import {
  AuthProvider,
  completeRequiredPassword,
  endAuthSession,
  resolveSignInStatus,
  signInWithPassword,
  useAuth,
} from '../AuthProvider.js';

function AuthWrapper({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}

async function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthWrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchAuthSession.mockResolvedValue({});
  mocks.signOut.mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('Amplify authentication operations', () => {
  it('signs in with a trimmed email through Cognito password authentication', async () => {
    mocks.signIn.mockResolvedValue({
      isSignedIn: true,
      nextStep: { signInStep: 'DONE' },
    });

    await expect(signInWithPassword(' user@example.com ', 'password'))
      .resolves.toBe(AuthStatus.SignedIn);
    expect(mocks.signIn).toHaveBeenCalledWith({
      options: { authFlowType: 'USER_PASSWORD_AUTH' },
      password: 'password',
      username: 'user@example.com',
    });
  });

  it('maps the required-password challenge to its distinct auth state', () => {
    expect(resolveSignInStatus({
      isSignedIn: false,
      nextStep: {
        missingAttributes: [],
        signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
      },
    })).toBe(AuthStatus.NewPasswordRequired);
  });

  it('rejects unsupported Cognito sign-in steps', () => {
    const unsupportedResult = {
      isSignedIn: false,
      nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_SMS_CODE' },
    } as SignInOutput;

    expect(() => resolveSignInStatus(unsupportedResult)).toThrow(
      'Unsupported Cognito sign-in step: CONFIRM_SIGN_IN_WITH_SMS_CODE',
    );
  });

  it('completes the admin-created user password challenge', async () => {
    mocks.confirmSignIn.mockResolvedValue({
      isSignedIn: true,
      nextStep: { signInStep: 'DONE' },
    });

    await expect(completeRequiredPassword('new-password'))
      .resolves.toBe(AuthStatus.SignedIn);
    expect(mocks.confirmSignIn).toHaveBeenCalledWith({
      challengeResponse: 'new-password',
    });
  });

  it('delegates token revocation and removal to Amplify sign-out', async () => {
    await endAuthSession();
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
});

describe('AuthProvider', () => {
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

  it('reports invalid credentials after Cognito rejects password authentication', async () => {
    const invalidCredentials = new Error('bad credentials');
    invalidCredentials.name = 'NotAuthorizedException';
    mocks.signIn.mockRejectedValue(invalidCredentials);
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe(AuthStatus.SignedOut));

    await act(async () => result.current.signIn('user@example.com', 'password'));

    expect(result.current.status).toBe(AuthStatus.SignedOut);
    expect(result.current.error).toBe('Invalid email and password combination');
  });

  it('clears the current authentication error', async () => {
    const invalidCredentials = new Error('bad credentials');
    invalidCredentials.name = 'NotAuthorizedException';
    mocks.signIn.mockRejectedValue(invalidCredentials);
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe(AuthStatus.SignedOut));
    await act(async () => result.current.signIn('user@example.com', 'password'));

    await act(async () => result.current.clearError());

    expect(result.current.error).toBeNull();
  });

  it('reports other password authentication failures separately', async () => {
    mocks.signIn.mockRejectedValue(new Error('network unavailable'));
    const { result } = await renderAuth();
    await waitFor(() => expect(result.current.status).toBe(AuthStatus.SignedOut));

    await act(async () => result.current.signIn('user@example.com', 'password'));

    expect(result.current.status).toBe(AuthStatus.SignedOut);
    expect(result.current.error).toContain('Unable to sign in');
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
