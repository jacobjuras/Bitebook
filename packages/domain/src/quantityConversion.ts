import convert, { type Unit as ConvertUnit } from 'convert';

import type { Quantity, Unit } from './quantity.js';

export type MeasurementFamily = 'mass' | 'volume' | 'count';

type ConvertibleUnit = Exclude<Unit, 'item'>;

const families: Record<Unit, MeasurementFamily> = {
  g: 'mass',
  kg: 'mass',
  oz: 'mass',
  lb: 'mass',
  ml: 'volume',
  l: 'volume',
  tsp: 'volume',
  tbsp: 'volume',
  cup: 'volume',
  flOz: 'volume',
  item: 'count',
};

const conversionUnits: Record<ConvertibleUnit, ConvertUnit> = {
  g: 'g',
  kg: 'kg',
  oz: 'oz',
  lb: 'lb',
  ml: 'mL',
  l: 'L',
  tsp: 'tsp',
  tbsp: 'tbsp',
  cup: 'cup',
  flOz: 'fl oz',
};

export function getMeasurementFamily(unit: Unit): MeasurementFamily {
  return families[unit];
}

export function areCompatibleUnits(first: Unit, second: Unit): boolean {
  return getMeasurementFamily(first) === getMeasurementFamily(second);
}

/** Converts a quantity to a compatible unit within its measurement family. */
export function convertQuantity(
  quantity: Quantity,
  targetUnit: Unit,
): Quantity {
  if (!areCompatibleUnits(quantity.unit, targetUnit)) {
    throw new RangeError(`Cannot convert ${quantity.unit} to ${targetUnit}`);
  }

  if (quantity.unit === 'item' || targetUnit === 'item') {
    return { ...quantity, unit: targetUnit };
  }

  const source = conversionUnits[quantity.unit];
  const target = conversionUnits[targetUnit];

  return {
    amount: convert(quantity.amount, source).to(target),
    unit: targetUnit,
  };
}
