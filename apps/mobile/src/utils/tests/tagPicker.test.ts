import { describe, expect, it } from 'vitest';

import type { TagPickerValue } from '~/models';
import { tagFixtures } from '~/tests/fixtures/tags';
import {
  getSelectableTags,
  getSelectedTags,
  hasTagCapacity,
  resolveTagInput,
} from '../tagPicker.js';

const emptyValue: TagPickerValue = { newTags: [], tagIds: [] };
const { fiber, protein } = tagFixtures;

describe('TagPicker utilities', () => {
  it('resolves selected Tags and filters unselected suggestions', () => {
    expect(getSelectedTags([fiber, protein], [protein.id])).toEqual([protein]);
    expect(getSelectableTags([fiber, protein], [fiber.id], 'pro')).toEqual([protein]);
    expect(getSelectableTags([fiber, protein], [], 'missing')).toEqual([fiber, protein]);
  });

  it('enforces the combined existing and new Tag limit', () => {
    expect(hasTagCapacity(emptyValue)).toBe(true);
    expect(hasTagCapacity({
      newTags: Array.from({ length: 9 }, (_, index) => ({ name: `tag-${index}` })),
      tagIds: [protein.id],
    })).toBe(false);
  });

  it.each([
    ['', 'empty'],
    ['favorite', 'reserved'],
    ['protein', 'existing'],
    ['new tag', 'new'],
  ] as const)('resolves %j input as %s', (input, kind) => {
    expect(resolveTagInput(input, [protein], emptyValue).kind).toBe(kind);
  });

  it('rejects Tags already selected or staged', () => {
    expect(resolveTagInput('protein', [protein], {
      newTags: [], tagIds: [protein.id],
    }).kind).toBe('duplicate');
    expect(resolveTagInput(' New Tag ', [], {
      newTags: [{ name: 'new tag' }], tagIds: [],
    }).kind).toBe('duplicate');
  });
});
