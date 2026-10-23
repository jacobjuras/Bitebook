import { describe, expect, it } from 'vitest';

import {
  normalizeTagName,
  tagCreateInputSchema,
  tagSchema,
  tagUpdateInputSchema,
} from '../tag.js';

const validTag = {
  color: '#1a2b3c',
  createdAt: '2026-10-23T01:00:00Z',
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: ' High Protein ',
  normalizedName: 'high protein',
  updatedAt: '2026-10-23T01:00:00Z',
  userId: 'user-123',
};

describe('Tag input schemas', () => {
  it('normalizes editable create fields', () => {
    expect(tagCreateInputSchema.parse({
      color: '#abcdef',
      name: ' High Protein ',
    })).toEqual({
      color: '#ABCDEF',
      name: 'High Protein',
    });
  });

  it('requires a name when creating a Tag', () => {
    expect(tagCreateInputSchema.safeParse({
      color: '#ABCDEF',
    }).success).toBe(false);
  });

  it('requires at least one editable field in an update', () => {
    expect(tagUpdateInputSchema.parse({ name: ' Protein ' })).toEqual({
      name: 'Protein',
    });
    expect(tagUpdateInputSchema.safeParse({}).success).toBe(false);
  });
});

describe('normalizeTagName', () => {
  it('normalizes case and surrounding whitespace', () => {
    expect(normalizeTagName(' High Protein ')).toBe('high protein');
  });
});

describe('tagSchema', () => {
  it('preserves the trimmed display name and normalizes color', () => {
    expect(tagSchema.parse(validTag)).toEqual({
      ...validTag,
      color: '#1A2B3C',
      name: 'High Protein',
    });
  });

  it('allows a Tag without a color', () => {
    const { color: _, ...tag } = validTag;

    expect(tagSchema.parse(tag)).toEqual({
      ...tag,
      name: 'High Protein',
    });
  });

  it.each([
    { ...validTag, id: 'not-a-uuid' },
    { ...validTag, userId: '' },
    { ...validTag, name: '' },
    { ...validTag, name: 'Favorite' },
    { ...validTag, normalizedName: 'High Protein' },
    { ...validTag, normalizedName: 'different' },
    { ...validTag, color: 'blue' },
    { ...validTag, color: '#1234' },
  ])('rejects invalid Tag metadata: %o', (tag) => {
    expect(tagSchema.safeParse(tag).success).toBe(false);
  });
});
