import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../theme/useThemeColors';

type PlaceholderScreenProps = {
  description: string;
  title: string;
};

export function PlaceholderScreen({
  description,
  title,
}: PlaceholderScreenProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text
        style={[styles.title, { color: colors.textPrimary }]}
        testID="placeholder-screen-title"
      >
        {title}
      </Text>
      <Text
        style={[styles.description, { color: colors.textSecondary }]}
        testID="placeholder-screen-description"
      >
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    padding: 24,
  },
  description: {
    fontSize: 17,
    lineHeight: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
  },
});
