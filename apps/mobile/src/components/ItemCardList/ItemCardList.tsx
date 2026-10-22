import { ScrollView } from 'react-native';

import { ItemCard } from '../ItemCard/ItemCard';
import type { ItemCardModel } from '../../models/itemCard';
import { styles } from './styles';

/** Renders structured items in a consistently spaced, scrollable card list. */
export function ItemCardList({
  items,
  testIDPrefix,
  topPadding = 24,
}: {
  items: readonly ItemCardModel[];
  testIDPrefix: string;
  topPadding?: number;
}) {
  return (
    <ScrollView
      contentContainerStyle={[styles.list, { paddingTop: topPadding }]}
      testID={`${testIDPrefix}-list`}
    >
      {items.map((item) => (
        // Item card
        <ItemCard
          item={item}
          key={item.id}
          testIDPrefix={testIDPrefix}
        />
      ))}
    </ScrollView>
  );
}
