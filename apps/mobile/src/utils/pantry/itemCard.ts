import type { Tag } from '@bitebook/domain';
import { createElement } from 'react';

import { FavoriteIndicator } from '~/components';
import type { ItemCardModel } from '~/models';

function renderFavoriteIndicator(testIDPrefix: string) {
  return createElement(FavoriteIndicator, { testIDPrefix });
}

/** Maps Pantry organization metadata and Tag references into card presentation. */
export function getItemCardOrganization(
  {
    isFavorite,
    tagIds,
  }: {
    isFavorite?: boolean;
    tagIds?: readonly string[];
  },
  tagsById: ReadonlyMap<string, Tag>,
): Pick<ItemCardModel, 'accessory' | 'chips'> {
  return {
    accessory: isFavorite === true ? renderFavoriteIndicator : undefined,
    chips: tagIds?.flatMap((tagId) => {
      const tag = tagsById.get(tagId);
      return tag ? [{ id: tag.id, label: tag.name }] : [];
    }),
  };
}
