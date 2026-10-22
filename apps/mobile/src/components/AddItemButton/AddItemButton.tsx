import { Pressable, Text } from 'react-native';

import { useThemeColors } from '../../theme/useThemeColors';
import { styles } from './styles';

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
