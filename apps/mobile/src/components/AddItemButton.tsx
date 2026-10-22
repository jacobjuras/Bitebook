import { Pressable, StyleSheet, Text } from 'react-native';

import { useThemeColors } from '../theme/useThemeColors';

/** Renders the primary action for adding an item to a list. */
export function AddItemButton({
  label,
  onPress,
  testIDPrefix,
}: {
  label: string;
  onPress: () => void;
  testIDPrefix: string;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={`${testIDPrefix}-add-button`}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.accent },
        pressed && styles.buttonPressed,
      ]}
    >
      <Text
        style={[styles.label, { color: colors.onAccent }]}
        testID={`${testIDPrefix}-add-button-label`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', borderRadius: 12, margin: 24, padding: 14 },
  buttonPressed: { opacity: 0.75 },
  label: { fontSize: 17, fontWeight: '600' },
});
