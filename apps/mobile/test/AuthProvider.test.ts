import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  revoke: vi.fn(),
  save: vi.fn(),
}));

vi.mock('expo-auth-session', () => ({
  exchangeCodeAsync: mocks.exchange,
  ResponseType: { Code: 'code' },
  revokeAsync: mocks.revoke,
  useAuthRequest: vi.fn(),
}));
vi.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: vi.fn(),
  openAuthSessionAsync: vi.fn(),
}));
vi.mock('../src/config/mobileConfig.js', () => ({
  getMobileConfig: () => ({
    cognitoUrl: new URL(
      'https://bitebook-beta.auth.us-west-2.amazoncognito.com',
    ),
    userPoolClientId: 'client-id',
  }),
}));
vi.mock('../src/auth/authSession.js', () => ({
  clearAuthSession: vi.fn(),
  loadAuthSession: vi.fn(),
  saveAuthSession: mocks.save,
}));

import {
  exchangeAuthorizationCode,
  revokeAuthSession,
} from '../src/auth/AuthProvider.js';

const session = {
  accessToken: 'access',
  expiresIn: 3600,
  idToken: 'id',
  issuedAt: 1234,
  refreshToken: 'refresh',
};

beforeEach(() => vi.clearAllMocks());

describe('Cognito authentication operations', () => {
  it('exchanges an authorization code with its PKCE verifier', async () => {
    mocks.exchange.mockResolvedValue(session);
    mocks.save.mockResolvedValue(session);

    await expect(exchangeAuthorizationCode('code', 'verifier'))
      .resolves.toEqual(session);
    expect(mocks.exchange).toHaveBeenCalledWith({
      clientId: 'client-id',
      code: 'code',
      extraParams: { code_verifier: 'verifier' },
      redirectUri: 'bitebook://auth/callback',
    }, {
      authorizationEndpoint: 'https://bitebook-beta.auth.us-west-2.amazoncognito.com/oauth2/authorize',
      revocationEndpoint: 'https://bitebook-beta.auth.us-west-2.amazoncognito.com/oauth2/revoke',
      tokenEndpoint: 'https://bitebook-beta.auth.us-west-2.amazoncognito.com/oauth2/token',
    });
    expect(mocks.save).toHaveBeenCalledWith(session);
  });

  it('revokes the stored refresh token', async () => {
    await revokeAuthSession(session);
    expect(mocks.revoke).toHaveBeenCalledWith({
      clientId: 'client-id',
      token: 'refresh',
    }, {
      authorizationEndpoint: 'https://bitebook-beta.auth.us-west-2.amazoncognito.com/oauth2/authorize',
      revocationEndpoint: 'https://bitebook-beta.auth.us-west-2.amazoncognito.com/oauth2/revoke',
      tokenEndpoint: 'https://bitebook-beta.auth.us-west-2.amazoncognito.com/oauth2/token',
    });
  });
});
