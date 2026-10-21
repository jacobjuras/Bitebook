import { describe, expect, it } from 'vitest';

import {
  manualStockChangeSchema,
  stockTransactionSchema,
} from '../stockTransaction.js';

const validTransaction = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  userId: 'user-123',
  foodId: '123e4567-e89b-42d3-a456-426614174001',
  direction: 'increase',
  quantity: { amount: 12, unit: 'item' },
  reason: 'restock',
  createdAt: '2026-10-19T01:00:00Z',
};

describe('stockTransactionSchema', () => {
  it('accepts a positive stock change', () => {
    expect(stockTransactionSchema.parse(validTransaction)).toEqual(
      validTransaction,
    );
  });

  it('accepts a transaction linked to a MealEntry', () => {
    const transaction = {
      ...validTransaction,
      direction: 'decrease',
      reason: 'mealEntry',
      mealEntryId: '123e4567-e89b-42d3-a456-426614174002',
    };

    expect(stockTransactionSchema.parse(transaction)).toEqual(transaction);
  });

  it.each([0, -1])('rejects a non-positive quantity: %s', (amount) => {
    expect(
      stockTransactionSchema.safeParse({
        ...validTransaction,
        quantity: { amount, unit: 'item' },
      }).success,
    ).toBe(false);
  });

  it('requires MealEntry transactions to identify their entry', () => {
    expect(
      stockTransactionSchema.safeParse({
        ...validTransaction,
        reason: 'mealEntryAdjustment',
      }).success,
    ).toBe(false);
  });
});

describe('manualStockChangeSchema', () => {
  it.each(['manualAdjustment', 'restock'] as const)(
    'accepts the %s reason',
    (reason) => {
      const change = {
        direction: 'increase',
        quantity: { amount: 2, unit: 'item' },
        reason,
      };

      expect(manualStockChangeSchema.parse(change)).toEqual(change);
    },
  );

  it('rejects automatic MealEntry reasons', () => {
    expect(
      manualStockChangeSchema.safeParse({
        direction: 'decrease',
        quantity: { amount: 1, unit: 'item' },
        reason: 'mealEntry',
      }).success,
    ).toBe(false);
  });

  it.each([0, -1])('rejects a non-positive quantity: %s', (amount) => {
    expect(
      manualStockChangeSchema.safeParse({
        direction: 'increase',
        quantity: { amount, unit: 'item' },
        reason: 'restock',
      }).success,
    ).toBe(false);
  });
});
