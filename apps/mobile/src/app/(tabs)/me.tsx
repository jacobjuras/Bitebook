import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { useThemeColors } from '../../theme/useThemeColors';

export default function MeScreen() {
  const colors = useThemeColors();
  const { error, signOut } = useAuth();

  // Me screen
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      {/* Profile content */}
      <View style={styles.content}>
        {/* Screen title */}
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          testID="me-tab-title"
        >Me</Text>
        {/* Profile description */}
        <Text
          style={[styles.description, { color: colors.textSecondary }]}
          testID="me-tab-description"
        >
          Manage your profile and goals.
        </Text>
      </View>
      {/* Sign-out button */}
      <Pressable
        accessibilityRole="button"
        onPress={() => void signOut()}
        testID="me-tab-sign-out-button"
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.control },
          pressed && styles.buttonPressed,
        ]}
      >
        {/* Sign-out button label */}
        <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Sign out</Text>
      </Pressable>
      {/* Sign-out error */}
      {error ? (
        <Text
          accessibilityRole="alert"
          style={[styles.error, { color: colors.textSecondary }]}
          testID="me-tab-sign-out-error"
        >
          {error}
        </Text>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 12,
    margin: 24,
    padding: 14,
  },
  buttonPressed: { opacity: 0.65 },
  buttonText: { fontSize: 17, fontWeight: '600' },
  content: { flex: 1, gap: 8, padding: 24 },
  description: { fontSize: 17, lineHeight: 24 },
  error: { marginHorizontal: 24, textAlign: 'center' },
  screen: { flex: 1 },
  title: { fontSize: 34, fontWeight: '700' },
});
