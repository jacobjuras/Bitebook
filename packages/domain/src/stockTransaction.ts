import * as z from 'zod';

import { quantitySchema } from './quantity.js';

export const stockTransactionReasonSchema = z.enum([
  'restock',
  'mealEntry',
  'mealEntryAdjustment',
  'mealEntryDeletion',
  'manualAdjustment',
]);

export const stockTransactionSchema = z
  .strictObject({
    id: z.uuid(),
    userId: z.string().min(1),
    foodId: z.uuid(),
    direction: z.enum(['increase', 'decrease']),
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
