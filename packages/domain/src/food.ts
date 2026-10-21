import * as z from 'zod';

import { nutritionFactsSchema } from './nutritionFacts.js';
import { quantitySchema } from './quantity.js';

const servingSizeSchema = quantitySchema.refine(
  ({ amount }) => amount > 0,
  'Serving size must be greater than zero',
);

const foodTagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(30)
  .refine((tag) => tag !== 'favorite' && tag !== 'favorites', {
    message: 'Favorite is reserved for the Food favorite state',
  });

const foodTagsSchema = z
  .array(foodTagSchema)
  .max(10)
  .transform((tags) => [...new Set(tags)]);

export const foodSchema = z.strictObject({
  id: z.uuid(),
  userId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  servingSize: servingSizeSchema,
  nutritionFacts: nutritionFactsSchema,
  isFavorite: z.boolean().optional(),
  tags: foodTagsSchema.optional(),
  lastLoggedAt: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Food = z.infer<typeof foodSchema>;
