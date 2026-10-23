import * as z from 'zod';

const pantryItemTagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(30)
  .refine((tag) => tag !== 'favorite' && tag !== 'favorites', {
    message: 'Favorite is reserved for the item favorite state',
  });

const pantryItemTagsSchema = z
  .array(pantryItemTagSchema)
  .max(10)
  .transform((tags) => [...new Set(tags)]);

export const pantryItemOrganizationSchema = z.strictObject({
  isFavorite: z.boolean().optional(),
  tags: pantryItemTagsSchema.optional(),
});
