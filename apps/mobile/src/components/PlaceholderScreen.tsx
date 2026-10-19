import { StyleSheet, Text, useColorScheme, View } from 'react-native';

type PlaceholderScreenProps = {
  description: string;
  title: string;
};

export function PlaceholderScreen({
  description,
  title,
}: PlaceholderScreenProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#111111' : '#ffffff' },
      ]}
    >
      <Text style={[styles.title, { color: isDark ? '#ffffff' : '#111111' }]}>
        {title}
      </Text>
      <Text style={[styles.description, { color: isDark ? '#bbbbbb' : '#555555' }]}>
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
