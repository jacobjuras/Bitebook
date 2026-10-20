import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  completePassword: vi.fn(),
  details: vi.fn(),
  fetch: vi.fn(),
  pool: vi.fn(),
  save: vi.fn(),
  user: vi.fn(),
}));

vi.mock('amazon-cognito-identity-js', () => ({
  AuthenticationDetails: class {
    constructor(data: unknown) { mocks.details(data); }
  },
  CognitoUser: class {
    constructor(data: unknown) { mocks.user(data); }
    authenticateUser(details: unknown, callbacks: unknown) {
      mocks.authenticate(details, callbacks);
    }
    completeNewPasswordChallenge(
      password: string,
      attributes: unknown,
      callbacks: unknown,
    ) {
      mocks.completePassword(password, attributes, callbacks);
    }
  },
  CognitoUserPool: class {
    constructor(data: unknown) { mocks.pool(data); }
  },
}));
vi.mock('../src/config/mobileConfig.js', () => ({
  getMobileConfig: () => ({
    cognitoUrl: new URL(
      'https://bitebook-beta.auth.us-west-2.amazoncognito.com',
    ),
    userPoolClientId: 'client-id',
    userPoolId: 'us-west-2_pool',
  }),
}));
vi.mock('../src/auth/authSession.js', () => ({
  clearAuthSession: vi.fn(),
  loadAuthSession: vi.fn(),
  saveAuthSession: mocks.save,
}));

import {
  completeRequiredPassword,
  revokeAuthSession,
  signInWithPassword,
} from '../src/auth/AuthProvider.js';

const storedSession = {
  accessToken: 'access',
  expiresIn: 3600,
  idToken: 'id',
  issuedAt: 100,
  refreshToken: 'refresh',
};
const cognitoSession = {
  getAccessToken: () => ({
    getExpiration: () => 3700,
    getIssuedAt: () => 100,
    getJwtToken: () => 'access',
  }),
  getIdToken: () => ({ getJwtToken: () => 'id' }),
  getRefreshToken: () => ({ getToken: () => 'refresh' }),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.save.mockResolvedValue(storedSession);
});

describe('Cognito authentication operations', () => {
  it('signs in with trimmed email through SRP and stores the tokens', async () => {
    mocks.authenticate.mockImplementation((_details, callbacks) => {
      callbacks.onSuccess(cognitoSession);
    });

    await expect(signInWithPassword(' user@example.com ', 'password'))
      .resolves.toEqual({ session: storedSession, user: expect.any(Object) });
    expect(mocks.user).toHaveBeenCalledWith(expect.objectContaining({
      Username: 'user@example.com',
    }));
    expect(mocks.details).toHaveBeenCalledWith({
      Password: 'password',
      Username: 'user@example.com',
    });
    expect(mocks.save).toHaveBeenCalledWith(storedSession);
  });

  it('returns the user when Cognito requires a new password', async () => {
    mocks.authenticate.mockImplementation((_details, callbacks) => {
      callbacks.newPasswordRequired();
    });
    await expect(signInWithPassword('user@example.com', 'temporary'))
      .resolves.toEqual({ session: null, user: expect.any(Object) });
  });

  it('completes the temporary-password challenge', async () => {
    mocks.authenticate.mockImplementation((_details, callbacks) => {
      callbacks.newPasswordRequired();
    });
    mocks.completePassword.mockImplementation((_password, _attributes, callbacks) => {
      callbacks.onSuccess(cognitoSession);
    });
    const { user } = await signInWithPassword('user@example.com', 'temporary');
    await expect(completeRequiredPassword(user, 'new-password'))
      .resolves.toEqual(storedSession);
    expect(mocks.completePassword).toHaveBeenCalledWith(
      'new-password',
      {},
      expect.any(Object),
    );
  });

  it('revokes the refresh token without opening a browser', async () => {
    mocks.fetch.mockResolvedValue({ ok: true });
    await revokeAuthSession(storedSession);
    const [url, options] = mocks.fetch.mock.calls[0];
    expect(url.href).toBe(
      'https://bitebook-beta.auth.us-west-2.amazoncognito.com/oauth2/revoke',
    );
    expect(options).toEqual(expect.objectContaining({
      body: 'client_id=client-id&token=refresh',
      method: 'POST',
    }));
  });
});
