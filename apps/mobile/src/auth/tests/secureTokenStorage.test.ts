import { beforeEach, describe, expect, it, vi } from 'vitest';

const secureStore = vi.hoisted(() => ({
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock('expo-secure-store', () => ({
  ...secureStore,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
}));

import { secureTokenStorage } from '../secureTokenStorage.js';

beforeEach(async () => {
  await secureTokenStorage.clear();
  vi.clearAllMocks();
});

describe('secureTokenStorage', () => {
  it('maps arbitrary Amplify keys into device-only SecureStore keys', async () => {
    const amplifyKey = 'Cognito.client.user@example.com.accessToken';
    await secureTokenStorage.setItem(amplifyKey, 'token');

    const [storedKey] = secureStore.setItemAsync.mock.calls[0];
    expect(storedKey).toMatch(/^amplify-[a-f0-9-]+$/);
    expect(storedKey).not.toContain('@');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      storedKey,
      'token',
      { keychainAccessible: 'device-only' },
    );

    secureStore.getItemAsync.mockResolvedValue('token');
    await expect(secureTokenStorage.getItem(amplifyKey)).resolves.toBe('token');
    expect(secureStore.getItemAsync).toHaveBeenCalledWith(storedKey);
  });

  it('removes the same protected value', async () => {
    const amplifyKey = 'Cognito.client.user@example.com.refreshToken';
    await secureTokenStorage.setItem(amplifyKey, 'refresh');
    const [storedKey] = secureStore.setItemAsync.mock.calls[0];

    await secureTokenStorage.removeItem(amplifyKey);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(storedKey);
  });

  it('clears every known protected key and forgets them', async () => {
    await secureTokenStorage.setItem('access-token-key', 'access');
    await secureTokenStorage.setItem('refresh-token-key', 'refresh');
    const storedKeys = secureStore.setItemAsync.mock.calls.map(([key]) => key);
    secureStore.deleteItemAsync.mockClear();

    await secureTokenStorage.clear();

    expect(secureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(storedKeys[0]);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(storedKeys[1]);

    secureStore.deleteItemAsync.mockClear();
    await secureTokenStorage.clear();
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
