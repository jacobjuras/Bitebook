import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchAuthSession: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: mocks.fetchAuthSession,
}));
vi.mock('../../config/mobileConfig.js', () => ({
  getMobileConfig: () => ({
    apiUrl: new URL('https://api.example.com/'),
  }),
}));
vi.stubGlobal('fetch', mocks.fetch);

import { authenticatedApiRequest } from '../apiClient.js';

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

  it('rejects non-OK API responses with the response status', async () => {
    mocks.fetchAuthSession.mockResolvedValue({
      tokens: { accessToken: { toString: () => 'access-token' } },
    });
    mocks.fetch.mockResolvedValue(new Response('unavailable', { status: 503 }));

    await expect(authenticatedApiRequest('foods')).rejects.toThrow(
      'Bitebook API request failed (503)',
    );
  });
});
