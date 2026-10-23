import * as z from 'zod';

/** Produces the canonical case-insensitive identity for a Tag name. */
export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase();
}

export const tagNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .refine(
    (name) => !['favorite', 'favorites'].includes(normalizeTagName(name)),
    { message: 'Favorite is reserved for the item favorite state' },
  );

export const normalizedTagNameSchema = z
  .string()
  .min(1)
  .max(30)
  .refine((name) => name === normalizeTagName(name), {
    message: 'Tag normalized name must be canonical',
  });

export const tagColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i)
  .transform((color) => color.toUpperCase());

export const tagCreateInputSchema = z.strictObject({
  color: tagColorSchema.optional(),
  name: tagNameSchema,
});

export const tagUpdateInputSchema = tagCreateInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0);

export const tagSchema = z.strictObject({
  id: z.uuid(),
  userId: z.string().min(1),
  name: tagNameSchema,
  normalizedName: normalizedTagNameSchema,
  color: tagColorSchema.optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).refine(
  ({ name, normalizedName }) => normalizeTagName(name) === normalizedName,
  {
    message: 'Tag normalized name must match its display name',
    path: ['normalizedName'],
  },
);

export type Tag = z.infer<typeof tagSchema>;
