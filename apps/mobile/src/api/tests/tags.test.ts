import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticatedApiRequest: vi.fn(),
}));

vi.mock('../apiClient.js', () => ({
  authenticatedApiRequest: mocks.authenticatedApiRequest,
}));

import { tagFixtures } from '~/tests/fixtures/tags';

import { createTag, listTags, updateTag } from '../tags.js';

const tag = tagFixtures.protein;

beforeEach(() => vi.clearAllMocks());

describe('Tags API', () => {
  it('requests and returns the authenticated user’s durable Tags', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify({ tags: [tag] })),
    );

    await expect(listTags()).resolves.toEqual([tag]);
    expect(mocks.authenticatedApiRequest).toHaveBeenCalledWith('tags');
  });

  it('creates and validates a Tag', async () => {
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify(tag)),
    );

    await expect(createTag({ name: 'protein' })).resolves.toEqual(tag);
    expect(mocks.authenticatedApiRequest).toHaveBeenCalledWith('tags', {
      body: JSON.stringify({ name: 'protein' }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
  });

  it('updates and validates editable Tag metadata', async () => {
    const updatedTag = {
      ...tag,
      color: '#ABCDEF',
      name: 'lean protein',
      normalizedName: 'lean protein',
    };
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify({ tag: updatedTag })),
    );

    await expect(updateTag(tag.id, {
      color: '#ABCDEF',
      name: 'lean protein',
    })).resolves.toEqual(updatedTag);
    expect(mocks.authenticatedApiRequest).toHaveBeenCalledWith(
      `tags/${tag.id}`,
      {
        body: JSON.stringify({ color: '#ABCDEF', name: 'lean protein' }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      },
    );
  });

  it.each([
    ['list', () => listTags(), {}],
    ['create', () => createTag({ name: 'protein' }), {}],
    ['update', () => updateTag(tag.id, { name: 'protein' }), {}],
  ])('rejects an invalid %s response', async (_case, request, body) => {
    mocks.authenticatedApiRequest.mockResolvedValue(
      new Response(JSON.stringify(body)),
    );

    await expect(request()).rejects.toThrow();
  });
});
