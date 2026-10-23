import * as z from 'zod';

import { nutritionFactsSchema } from './nutrition.js';
import { pantryItemOrganizationSchema } from './pantryItem.js';
import { quantitySchema } from './quantity.js';

const servingSizeSchema = quantitySchema.refine(
  ({ amount }) => amount > 0,
  'Serving size must be greater than zero',
);

export const foodSchema = z.strictObject({
  ...pantryItemOrganizationSchema.shape,
  id: z.uuid(),
  userId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  servingSize: servingSizeSchema,
  nutritionFacts: nutritionFactsSchema,
  lastLoggedAt: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Food = z.infer<typeof foodSchema>;
