import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../theme/useThemeColors';

export type ItemCardModel = {
  accessory?: (itemTestIDPrefix: string) => ReactNode;
  chips?: readonly {
    id: string;
    label: string;
  }[];
  details: readonly {
    id: string;
    text: string;
  }[];
  id: string;
  title: string;
};

/** Renders a reusable card for an item's title, details, and chips. */
export function ItemCard({
  item: { accessory, chips, details, id, title },
  testIDPrefix,
}: {
  item: ItemCardModel;
  testIDPrefix: string;
}) {
  const colors = useThemeColors();
  const itemTestIDPrefix = `${testIDPrefix}-${id}`;

  return (
    <View
      style={[styles.card, { borderColor: colors.border }]}
      testID={`${itemTestIDPrefix}-card`}
    >
      <View style={styles.titleRow}>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          testID={`${itemTestIDPrefix}-card-title`}
        >
          {title}
        </Text>
        {accessory?.(itemTestIDPrefix)}
      </View>
      {details.map(({ id, text }) => (
        <Text
          key={id}
          style={[styles.detail, { color: colors.textSecondary }]}
          testID={`${itemTestIDPrefix}-${id}`}
        >
          {text}
        </Text>
      ))}
      {chips && chips.length > 0 ? (
        <View style={styles.chips} testID={`${itemTestIDPrefix}-chips`}>
          {chips.map(({ id, label }) => (
            <Text
              key={id}
              style={[
                styles.chip,
                {
                  backgroundColor: colors.control,
                  color: colors.textSecondary,
                },
              ]}
              testID={`${itemTestIDPrefix}-chip-${id}`}
            >
              {label}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, gap: 8, padding: 14 },
  detail: { fontSize: 14 },
  chip: {
    borderRadius: 8,
    fontSize: 12,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  title: { flex: 1, fontSize: 17, fontWeight: '600' },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
});
