import { describe, expect, it } from 'vitest';

import { handler } from '../src/index.js';

describe('handler', () => {
  it('rejects requests before authentication is connected', async () => {
    await expect(handler()).resolves.toEqual({
      body: JSON.stringify({ message: 'Authentication required' }),
      headers: { 'content-type': 'application/json' },
      statusCode: 401,
    });
  });
});
