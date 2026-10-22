import { Fragment, type ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

type ItemCardListProps<Item> = {
  items: readonly Item[];
  keyExtractor: (item: Item) => string;
  renderItem: (item: Item, testIDPrefix: string) => ReactNode;
  testIDPrefix: string;
  topPadding?: number;
};

/** Renders items in a consistently spaced, scrollable card list. */
export function ItemCardList<Item>({
  items,
  keyExtractor,
  renderItem,
  testIDPrefix,
  topPadding = 24,
}: ItemCardListProps<Item>) {
  return (
    <ScrollView
      contentContainerStyle={[styles.list, { paddingTop: topPadding }]}
      testID={`${testIDPrefix}-list`}
    >
      {items.map((item) => {
        const key = keyExtractor(item);
        return (
          <Fragment key={key}>
            {renderItem(item, `${testIDPrefix}-${key}`)}
          </Fragment>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingBottom: 24, paddingHorizontal: 24 },
});
