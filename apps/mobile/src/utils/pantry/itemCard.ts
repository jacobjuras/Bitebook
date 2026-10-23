import { createElement } from 'react';

import { FavoriteIndicator } from '~/components';
import type { ItemCardModel } from '~/models';

function renderFavoriteIndicator(testIDPrefix: string) {
  return createElement(FavoriteIndicator, { testIDPrefix });
}

/** Maps shared Pantry-item organization metadata into card presentation. */
export function getItemCardOrganization({
  isFavorite,
  tags,
}: {
  isFavorite?: boolean;
  tags?: readonly string[];
}): Pick<ItemCardModel, 'accessory' | 'chips'> {
  return {
    accessory: isFavorite === true ? renderFavoriteIndicator : undefined,
    chips: tags?.map((tag) => ({ id: tag, label: tag })),
  };
}
