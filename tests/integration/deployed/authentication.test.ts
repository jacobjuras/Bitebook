import { beforeAll, describe, expect, it } from 'vitest';

import { getDeployedApiUrl } from '../src/config.js';

describe('API authentication', () => {
  let apiUrl: URL;

  beforeAll(() => {
    apiUrl = getDeployedApiUrl();
  });

  it('rejects requests without an access token', async () => {
    const response = await fetch(new URL('foods', apiUrl), {
      headers: { Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });

    expect(response.status).toBe(401);
  });
});
