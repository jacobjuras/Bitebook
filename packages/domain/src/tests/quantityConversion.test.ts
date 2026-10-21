import { describe, expect, it } from 'vitest';

import {
  areCompatibleUnits,
  convertQuantity,
  getMeasurementFamily,
} from '../quantityConversion.js';

describe('quantity conversion', () => {
  it.each([
    ['g', 'mass'],
    ['cup', 'volume'],
    ['item', 'count'],
  ] as const)('classifies %s as %s', (unit, family) => {
    expect(getMeasurementFamily(unit)).toBe(family);
  });

  it('converts between mass units', () => {
    const result = convertQuantity({ amount: 1, unit: 'oz' }, 'g');

    expect(result.unit).toBe('g');
    expect(result.amount).toBeCloseTo(28.349_523_125);
  });

  it('converts between volume units', () => {
    const result = convertQuantity({ amount: 1, unit: 'cup' }, 'ml');

    expect(result.unit).toBe('ml');
    expect(result.amount).toBeCloseTo(236.588_236_5);
  });

  it('preserves item quantities', () => {
    expect(convertQuantity({ amount: 3, unit: 'item' }, 'item')).toEqual({
      amount: 3,
      unit: 'item',
    });
  });

  it('rejects conversions between measurement families', () => {
    expect(areCompatibleUnits('g', 'ml')).toBe(false);
    expect(() =>
      convertQuantity({ amount: 1, unit: 'g' }, 'ml'),
    ).toThrow(RangeError);
  });
});
