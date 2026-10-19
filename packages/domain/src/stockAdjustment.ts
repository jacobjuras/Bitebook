import { quantitySchema, type Quantity } from './quantity.js';
import { convertQuantity } from './quantityConversion.js';
import type { StockTransaction } from './stockTransaction.js';

/** Calculates stock after a validated increase or decrease without mutating the original quantity. */
export function calculateStockAfterChange(
  currentStock: Quantity,
  direction: StockTransaction['direction'],
  change: Quantity,
): Quantity {
  if (change.amount <= 0) {
    throw new RangeError('Stock change must be greater than zero');
  }

  const convertedChange = convertQuantity(change, currentStock.unit);
  const amount =
    direction === 'increase'
      ? currentStock.amount + convertedChange.amount
      : currentStock.amount - convertedChange.amount;

  if (amount < 0) {
    throw new RangeError('Stock cannot be decreased below zero');
  }

  return quantitySchema.parse({ amount, unit: currentStock.unit });
}
