import { ScrollView, StyleSheet } from 'react-native';

import { ItemCard, type ItemCardModel } from './ItemCard';

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

const styles = StyleSheet.create({
  list: { gap: 10, paddingBottom: 24, paddingHorizontal: 24 },
});
