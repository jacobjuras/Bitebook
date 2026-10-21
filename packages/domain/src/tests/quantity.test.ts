import { describe, expect, it } from 'vitest';

import { quantitySchema } from '../quantity.js';

describe('quantitySchema', () => {
  it('accepts zero as a valid depleted quantity', () => {
    expect(quantitySchema.parse({ amount: 0, unit: 'g' })).toEqual({
      amount: 0,
      unit: 'g',
    });
  });

  it.each([
    { amount: -1, unit: 'g' },
    { amount: Number.POSITIVE_INFINITY, unit: 'g' },
    { amount: 1, unit: 'stone' },
  ])('rejects an invalid quantity: %o', (quantity) => {
    expect(quantitySchema.safeParse(quantity).success).toBe(false);
  });
});
