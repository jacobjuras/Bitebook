import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../theme/useThemeColors';

type ItemCardProps = {
  accessory?: ReactNode;
  children?: ReactNode;
  testIDPrefix: string;
  title: string;
};

/** Renders a reusable card shell for a titled item and its supporting content. */
export function ItemCard({
  accessory,
  children,
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
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, gap: 8, padding: 14 },
  title: { flex: 1, fontSize: 17, fontWeight: '600' },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
});
