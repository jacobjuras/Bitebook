import * as z from 'zod';

const pantryItemTagIdsSchema = z
  .array(z.uuid())
  .max(10)
  .transform((tagIds) => [...new Set(tagIds)]);

export const pantryItemOrganizationSchema = z.strictObject({
  isFavorite: z.boolean().optional(),
  tagIds: pantryItemTagIdsSchema.optional(),
});
