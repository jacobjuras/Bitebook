import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  configure: vi.fn(),
  confirmSignIn: vi.fn(),
  fetchAuthSession: vi.fn(),
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

import {
  completeRequiredPassword,
  endAuthSession,
  resolveSignInStatus,
  signInWithPassword,
} from '../src/auth/AuthProvider.js';

beforeEach(() => vi.clearAllMocks());

describe('Amplify authentication operations', () => {
  it('signs in with trimmed email through explicit SRP', async () => {
    mocks.signIn.mockResolvedValue({
      isSignedIn: true,
      nextStep: { signInStep: 'DONE' },
    });

    await expect(signInWithPassword(' user@example.com ', 'password'))
      .resolves.toBe('signed-in');
    expect(mocks.signIn).toHaveBeenCalledWith({
      options: { authFlowType: 'USER_SRP_AUTH' },
      password: 'password',
      username: 'user@example.com',
    });
  });

  it('completes the admin-created user password challenge', async () => {
    expect(resolveSignInStatus({
      isSignedIn: false,
      nextStep: {
        missingAttributes: [],
        signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
      },
    })).toBe('new-password-required');
    mocks.confirmSignIn.mockResolvedValue({
      isSignedIn: true,
      nextStep: { signInStep: 'DONE' },
    });

    await expect(completeRequiredPassword('new-password'))
      .resolves.toBe('signed-in');
    expect(mocks.confirmSignIn).toHaveBeenCalledWith({
      challengeResponse: 'new-password',
    });
  });

  it('delegates token revocation and removal to Amplify sign-out', async () => {
    await endAuthSession();
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
});
