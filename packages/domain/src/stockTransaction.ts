import * as z from 'zod';

import { quantitySchema } from './quantity.js';

export const stockTransactionDirectionSchema = z.enum(['increase', 'decrease']);

export const stockTransactionIdSchema = z.uuid();

export const stockTransactionReasonSchema = z.enum([
  'restock',
  'mealEntry',
  'mealEntryAdjustment',
  'mealEntryDeletion',
  'manualAdjustment',
]);

export const manualStockChangeSchema = z.strictObject({
  direction: stockTransactionDirectionSchema,
  quantity: quantitySchema.refine(({ amount }) => amount > 0),
  reason: stockTransactionReasonSchema.extract(['manualAdjustment', 'restock']),
});

export const stockTransactionSchema = z
  .strictObject({
    id: stockTransactionIdSchema,
    userId: z.string().min(1),
    foodId: z.uuid(),
    direction: stockTransactionDirectionSchema,
    quantity: quantitySchema.refine(({ amount }) => amount > 0),
    reason: stockTransactionReasonSchema,
    mealEntryId: z.uuid().optional(),
    createdAt: z.iso.datetime(),
  })
  .refine(
    ({ reason, mealEntryId }) =>
      !reason.startsWith('mealEntry') || mealEntryId !== undefined,
    {
      message: 'Meal Entry transactions require a Meal Entry ID',
      path: ['mealEntryId'],
    },
  );

export type StockTransactionReason = z.infer<
  typeof stockTransactionReasonSchema
>;
export type StockTransaction = z.infer<typeof stockTransactionSchema>;
