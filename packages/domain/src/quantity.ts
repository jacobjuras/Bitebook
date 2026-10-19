import * as z from 'zod';

export const unitSchema = z.enum([
  'g',
  'kg',
  'oz',
  'lb',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'flOz',
  'item',
]);

export const quantitySchema = z.strictObject({
  amount: z.number().finite().nonnegative(),
  unit: unitSchema,
});

export type Quantity = z.infer<typeof quantitySchema>;
export type Unit = z.infer<typeof unitSchema>;
