import { describe, expect, it } from 'vitest';

import { MIN_PASSWORD_LENGTH } from '../authentication-constants.js';

describe('MIN_PASSWORD_LENGTH', () => {
  it('requires passwords to contain at least eight characters', () => {
    expect('1234567').toHaveLength(MIN_PASSWORD_LENGTH - 1);
    expect('12345678').toHaveLength(MIN_PASSWORD_LENGTH);
  });
});
