import { normalizeTagName, type Tag } from '@bitebook/domain';

import { TAG_PICKER_MAX_TAGS } from '~/constants';
import type { TagPickerValue } from '~/models';

export type TagInputResolution =
  | { kind: 'duplicate' }
  | { kind: 'empty' }
  | { kind: 'existing'; tag: Tag }
  | { kind: 'limit' }
  | { kind: 'new'; tag: Pick<Tag, 'name'> }
  | { kind: 'reserved' };

/** Resolves selected Tag IDs to the available Tag records in selection order. */
export function getSelectedTags(
  availableTags: readonly Tag[],
  selectedTagIds: readonly string[],
): Tag[] {
  return selectedTagIds.flatMap((tagId) => {
    const tag = availableTags.find(({ id }) => id === tagId);
    return tag ? [tag] : [];
  });
}

/** Returns unselected Tag suggestions, filtering by input only when matches exist. */
export function getSelectableTags(
  availableTags: readonly Tag[],
  selectedTagIds: readonly string[],
  input: string,
): Tag[] {
  const unselectedTags = availableTags.filter(
    ({ id }) => !selectedTagIds.includes(id),
  );
  const normalizedInput = normalizeTagName(input);
  if (!normalizedInput) return unselectedTags;

  const matches = unselectedTags.filter(({ normalizedName }) =>
    normalizedName.includes(normalizedInput),
  );
  return matches.length > 0 ? matches : unselectedTags;
}

/** Reports whether another existing or new Tag can be selected. */
export function hasTagCapacity(value: TagPickerValue): boolean {
  return value.tagIds.length + value.newTags.length < TAG_PICKER_MAX_TAGS;
}

/** Classifies typed Tag input into the next selection or validation outcome. */
export function resolveTagInput(
  input: string,
  availableTags: readonly Tag[],
  value: TagPickerValue,
): TagInputResolution {
  const name = input.trim();
  const normalizedName = normalizeTagName(name);
  if (!normalizedName) return { kind: 'empty' };
  if (normalizedName === 'favorite' || normalizedName === 'favorites') {
    return { kind: 'reserved' };
  }

  const existingTag = availableTags.find(
    (tag) => tag.normalizedName === normalizedName,
  );
  if (existingTag) {
    return value.tagIds.includes(existingTag.id)
      ? { kind: 'duplicate' }
      : { kind: 'existing', tag: existingTag };
  }
  if (value.newTags.some((tag) => normalizeTagName(tag.name) === normalizedName)) {
    return { kind: 'duplicate' };
  }
  return hasTagCapacity(value)
    ? { kind: 'new', tag: { name } }
    : { kind: 'limit' };
}
