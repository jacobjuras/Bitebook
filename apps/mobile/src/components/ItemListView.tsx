import type { ReactNode } from 'react';

import { AddItemButton } from './AddItemButton';
import { type ContentState, ContentStateView } from './ContentStateView';
import type { ItemCardModel } from './ItemCard';
import { ItemCardList } from './ItemCardList';

/** Composes controls, content, and the primary action for an item list. */
export function ItemListView({
  action,
  contentState,
  controls,
  items,
  itemTestIDPrefix,
  testIDPrefix,
  topPadding,
}: {
  action?: {
    label: string;
    onPress: () => void;
    testIDPrefix: string;
  };
  contentState: ContentState | null;
  controls?: ReactNode;
  items: readonly ItemCardModel[];
  itemTestIDPrefix: string;
  testIDPrefix: string;
  topPadding?: number;
}) {
  return (
    <>
      {controls}
      {contentState ? (
        // Content state
        <ContentStateView state={contentState} testIDPrefix={testIDPrefix} />
      ) : (
        // Item card list
        <ItemCardList
          items={items}
          testIDPrefix={itemTestIDPrefix}
          topPadding={topPadding}
        />
      )}
      {action ? (
        // Add item button
        <AddItemButton
          label={action.label}
          onPress={action.onPress}
          testIDPrefix={action.testIDPrefix}
        />
      ) : null}
    </>
  );
}
