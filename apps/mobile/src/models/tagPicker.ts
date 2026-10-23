import type { Tag } from '@bitebook/domain';

export type TagPickerValue = {
  newTags: Pick<Tag, 'color' | 'name'>[];
  tagIds: string[];
};
