import { describe, expect, it } from 'vitest';

import { AuthStatus } from '../AuthStatus.js';

describe('AuthStatus', () => {
  it('exposes stable, distinct values for every authentication branch', () => {
    expect(AuthStatus).toEqual({
      Loading: 'loading',
      NewPasswordRequired: 'new-password-required',
      SignedIn: 'signed-in',
      SignedOut: 'signed-out',
    });
    expect(new Set(Object.values(AuthStatus))).toHaveLength(4);
  });
});
