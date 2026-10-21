import { describe, expect, it } from 'vitest';

import { jsonResponse } from '../http.js';

describe('jsonResponse', () => {
  it('serializes a JSON response with its status and content type', () => {
    expect(jsonResponse(201, { id: 'food-1' })).toEqual({
      body: '{"id":"food-1"}',
      headers: { 'content-type': 'application/json' },
      statusCode: 201,
    });
  });
});
