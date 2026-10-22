import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../theme/useThemeColors';

type ItemCardChip = {
  id: string;
  label: string;
};

type ItemCardDetail = {
  id: string;
  text: string;
};

type ItemCardProps = {
  accessory?: ReactNode;
  chips?: readonly ItemCardChip[];
  details: readonly ItemCardDetail[];
  testIDPrefix: string;
  title: string;
};

/** Renders a reusable card for an item's title, details, and chips. */
export function ItemCard({
  accessory,
  chips,
  details,
  testIDPrefix,
  title,
}: ItemCardProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.card, { borderColor: colors.border }]}
      testID={`${testIDPrefix}-card`}
    >
      <View style={styles.titleRow}>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          testID={`${testIDPrefix}-card-title`}
        >
          {title}
        </Text>
        {accessory}
      </View>
      {details.map(({ id, text }) => (
        <Text
          key={id}
          style={[styles.detail, { color: colors.textSecondary }]}
          testID={`${testIDPrefix}-${id}`}
        >
          {text}
        </Text>
      ))}
      {chips && chips.length > 0 ? (
        <View style={styles.chips} testID={`${testIDPrefix}-chips`}>
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
              testID={`${testIDPrefix}-chip-${id}`}
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
