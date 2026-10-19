import { describe, expect, it } from 'vitest';

import { calculateStockAfterChange } from '../src/index.js';

describe('calculateStockAfterChange', () => {
  it('increases stock while preserving its stored unit', () => {
    expect(
      calculateStockAfterChange(
        { amount: 500, unit: 'g' },
        'increase',
        { amount: 0.5, unit: 'kg' },
      ),
    ).toEqual({ amount: 1_000, unit: 'g' });
  });

  it('decreases stock while preserving its stored unit', () => {
    expect(
      calculateStockAfterChange(
        { amount: 1, unit: 'l' },
        'decrease',
        { amount: 250, unit: 'ml' },
      ),
    ).toEqual({ amount: 0.75, unit: 'l' });
  });

  it('does not mutate the current stock', () => {
    const currentStock = { amount: 12, unit: 'item' } as const;

    calculateStockAfterChange(
      currentStock,
      'decrease',
      { amount: 2, unit: 'item' },
    );

    expect(currentStock).toEqual({ amount: 12, unit: 'item' });
  });

  it('rejects a decrease larger than the current stock', () => {
    expect(() =>
      calculateStockAfterChange(
        { amount: 1, unit: 'item' },
        'decrease',
        { amount: 2, unit: 'item' },
      ),
    ).toThrow(RangeError);
  });

  it.each([0, -1])('rejects a non-positive stock change: %s', (amount) => {
    expect(() =>
      calculateStockAfterChange(
        { amount: 1, unit: 'item' },
        'increase',
        { amount, unit: 'item' },
      ),
    ).toThrow(RangeError);
  });

  it('rejects incompatible stock and change units', () => {
    expect(() =>
      calculateStockAfterChange(
        { amount: 1, unit: 'kg' },
        'increase',
        { amount: 1, unit: 'l' },
      ),
    ).toThrow(RangeError);
  });
});
