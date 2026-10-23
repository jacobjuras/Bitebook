import { tagSchema, type Tag } from '@bitebook/domain';

import { authenticatedApiRequest } from './apiClient';

type TagCreateInput = Pick<Tag, 'color' | 'name'>;
type TagUpdate = Partial<TagCreateInput>;

/** Loads and validates the authenticated user's durable Tags. */
export async function listTags(): Promise<Tag[]> {
  const response = await authenticatedApiRequest('tags');
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('tags' in body)) {
    throw new Error('Bitebook API returned an invalid Tags response');
  }
  return tagSchema.array().parse(body.tags);
}

/** Creates and validates one durable Tag for the authenticated user. */
export async function createTag(input: TagCreateInput): Promise<Tag> {
  const response = await authenticatedApiRequest('tags', {
    body: JSON.stringify(input),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  return tagSchema.parse(await response.json());
}

/** Updates editable metadata for one authenticated user's Tag. */
export async function updateTag(tagId: string, update: TagUpdate): Promise<Tag> {
  const response = await authenticatedApiRequest(`tags/${tagId}`, {
    body: JSON.stringify(update),
    headers: { 'content-type': 'application/json' },
    method: 'PATCH',
  });
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object' || !('tag' in body)) {
    throw new Error('Bitebook API returned an invalid Tag response');
  }
  return tagSchema.parse(body.tag);
}
