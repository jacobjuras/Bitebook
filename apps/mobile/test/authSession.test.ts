import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureStore = vi.hoisted(() => ({
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock('expo-secure-store', () => ({
  ...secureStore,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

import {
  loadAuthSession,
  saveAuthSession,
  type AuthTokenResponse,
} from '../src/auth/authSession.js';

const completeResponse = {
  accessToken: 'access-token',
  expiresIn: 3600,
  idToken: 'id-token',
  issuedAt: 1234,
  refreshToken: 'refresh-token',
} satisfies AuthTokenResponse;

beforeEach(() => vi.clearAllMocks());

describe('auth session storage', () => {
  it('stores complete tokens using device-only secure storage', async () => {
    await expect(saveAuthSession(completeResponse)).resolves.toEqual(
      completeResponse,
    );
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      'bitebook-auth-session',
      JSON.stringify(completeResponse),
      { keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
    );
  });

  it('rejects incomplete Cognito token responses', async () => {
    await expect(saveAuthSession({
      ...completeResponse,
      refreshToken: undefined,
    } satisfies AuthTokenResponse)).rejects.toThrow('incomplete authentication session');
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('loads a valid stored session', async () => {
    secureStore.getItemAsync.mockResolvedValue(JSON.stringify(completeResponse));
    await expect(loadAuthSession()).resolves.toEqual(completeResponse);
  });

  it('clears malformed stored session data', async () => {
    secureStore.getItemAsync.mockResolvedValue('{invalid');
    await expect(loadAuthSession()).resolves.toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      'bitebook-auth-session',
    );
  });
});
