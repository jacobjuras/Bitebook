import { describe, expect, it } from 'vitest';

import { getDeployedApiUrl } from '../config.js';

describe('getDeployedApiUrl', () => {
  it('normalizes a secure API base URL', () => {
    expect(
      getDeployedApiUrl({ BITEBOOK_API_URL: 'https://api.example.com/beta' })
        .href,
    ).toBe('https://api.example.com/beta/');
  });

  it('preserves an existing trailing slash', () => {
    expect(
      getDeployedApiUrl({ BITEBOOK_API_URL: 'https://api.example.com/beta/' })
        .href,
    ).toBe('https://api.example.com/beta/');
  });

  it('requires the API URL', () => {
    expect(() => getDeployedApiUrl({})).toThrow(
      'BITEBOOK_API_URL is required',
    );
  });

  it.each([
    'http://api.example.com',
    'https://user:password@api.example.com',
    'https://api.example.com?token=value',
    'https://api.example.com#fragment',
  ])('rejects unsafe or non-base URL %s', (value) => {
    expect(() => getDeployedApiUrl({ BITEBOOK_API_URL: value })).toThrow();
  });
});
