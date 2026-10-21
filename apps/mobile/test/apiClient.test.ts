import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchAuthSession: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: mocks.fetchAuthSession,
}));
vi.mock('../src/config/mobileConfig.js', () => ({
  getMobileConfig: () => ({
    apiUrl: new URL('https://api.example.com/'),
  }),
}));
vi.stubGlobal('fetch', mocks.fetch);

import { authenticatedApiRequest } from '../src/api/apiClient.js';

beforeEach(() => vi.clearAllMocks());

describe('authenticated API client', () => {
  it('adds the current Cognito access token', async () => {
    mocks.fetchAuthSession.mockResolvedValue({
      tokens: { accessToken: { toString: () => 'access-token' } },
    });
    mocks.fetch.mockResolvedValue(new Response('{}'));

    await authenticatedApiRequest('foods');

    const [url, init] = mocks.fetch.mock.calls[0];
    expect(url.href).toBe('https://api.example.com/foods');
    expect(init.headers.get('authorization')).toBe('Bearer access-token');
    expect(init.headers.get('accept')).toBe('application/json');
  });

  it('rejects requests without an authenticated session', async () => {
    mocks.fetchAuthSession.mockResolvedValue({});

    await expect(authenticatedApiRequest('foods'))
      .rejects.toThrow('Authentication required');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
