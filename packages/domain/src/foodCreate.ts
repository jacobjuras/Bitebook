import * as z from 'zod';

import { foodSchema } from './food.js';
import { normalizeTagName, tagCreateInputSchema } from './tag.js';

export const foodCreateInputSchema = foodSchema.pick({
  isFavorite: true,
  name: true,
  nutritionFacts: true,
  servingSize: true,
  tagIds: true,
}).extend({
  newTags: tagCreateInputSchema.array().max(10).optional(),
}).refine(
  ({ newTags = [], tagIds = [] }) => tagIds.length + newTags.length <= 10,
  { message: 'A Food can have at most 10 Tags' },
).refine(
  ({ newTags = [] }) => new Set(
    newTags.map(({ name }) => normalizeTagName(name)),
  ).size === newTags.length,
  { message: 'New Tag names must be unique' },
);

export type FoodCreateInput = z.infer<typeof foodCreateInputSchema>;
