import { Text, View } from 'react-native';

import type { ItemCardModel } from '../../models/itemCard';

import { useThemeColors } from '../../theme/useThemeColors';
import { styles } from './styles';

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
