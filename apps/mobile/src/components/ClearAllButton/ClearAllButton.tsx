import { Pressable, Text } from 'react-native';

import { useThemeColors } from '~/theme';

import { styles } from './styles';

/** Renders a compact action that clears the caller's current selections. */
export function ClearAllButton({
  accessibilityLabel,
  onPress,
  testID,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  testID: string;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      testID={testID}
    >
      <Text style={[styles.text, { color: colors.accent }]}>Clear all</Text>
    </Pressable>
  );
}
