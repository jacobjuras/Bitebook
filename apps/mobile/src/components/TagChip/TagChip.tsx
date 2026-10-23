import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text } from 'react-native';

import { TagChipVariant } from '~/constants';
import type { TagChipModel } from '~/models';
import { useThemeColors } from '~/theme';

import { styles } from './styles';

/** Renders a selectable or removable chip using one of the supported states. */
export function TagChip({
  accessibilityLabel,
  id,
  label,
  onPress,
  testIDPrefix,
  variant,
}: TagChipModel) {
  const colors = useThemeColors();
  const testID = `${testIDPrefix}-${id}`;

  function getVariantStyle() {
    switch (variant) {
      case TagChipVariant.Available:
        return [styles.available, { borderColor: colors.border }];
      case TagChipVariant.Selected:
        return { backgroundColor: colors.accentSubtle };
      case TagChipVariant.Pending:
        return [styles.pending, { borderColor: colors.accent }];
      default:
        variant satisfies never;
        throw new Error('Unsupported Tag chip variant');
    }
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        getVariantStyle(),
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      {variant === TagChipVariant.Pending ? (
        <Ionicons
          color={colors.accent}
          name="add"
          size={14}
          testID={`${testID}-leading-icon`}
        />
      ) : null}
      <Text style={[styles.text, { color: colors.textPrimary }]}>{label}</Text>
      {variant !== TagChipVariant.Available ? (
        <Ionicons
          color={colors.textSecondary}
          name="close"
          size={14}
          testID={`${testID}-trailing-icon`}
        />
      ) : null}
    </Pressable>
  );
}
