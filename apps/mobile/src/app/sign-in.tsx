import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { AuthStatus } from '../auth/AuthStatus';
import { useThemeColors } from '../theme/useThemeColors';

/** Presents first-party Cognito authentication before the tabbed app is available. */
export default function SignInScreen() {
  const colors = useThemeColors();
  const { confirmNewPassword, error, signIn, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const needsNewPassword = status === AuthStatus.NewPasswordRequired;
  const isLoading = status === AuthStatus.Loading;
  const isDisabled =
    isLoading
    || !password
    || (!needsNewPassword && !email.trim());

  async function submit() {
    const submittedPassword = password;
    setPassword('');

    if (needsNewPassword) {
      await confirmNewPassword(submittedPassword);
      return;
    }
    await signIn(email, submittedPassword);
  }

  // Authentication screen
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Sign-in form */}
      <View style={styles.content}>
        {/* App title */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Bitebook</Text>
        {/* Sign-in instructions */}
        <Text
          style={[styles.description, { color: colors.textSecondary }]}
          testID="sign-in-instructions"
        >
          {needsNewPassword
            ? 'Choose a permanent password to finish signing in.'
            : 'Sign in to access your foods, meals, goals, and reports.'}
        </Text>
        {/* Email input */}
        {!needsNewPassword ? (
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email address"
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
            testID="sign-in-email-input"
            value={email}
          />
        ) : null}
        {/* Password input */}
        <TextInput
          autoCapitalize="none"
          autoComplete={needsNewPassword ? 'new-password' : 'current-password'}
          onChangeText={setPassword}
          onSubmitEditing={() => void submit()}
          placeholder={needsNewPassword ? 'New password' : 'Password'}
          secureTextEntry
          style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
          testID="sign-in-password-input"
          value={password}
        />
        {/* Sign-in button */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled }}
          disabled={isDisabled}
          onPress={() => void submit()}
          testID="sign-in-submit-button"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.accent },
            (pressed || isDisabled) && styles.dimmed,
          ]}
        >
          {isLoading ? (
            // Sign-in progress indicator
            <ActivityIndicator color={colors.onAccent} testID="sign-in-loading-indicator" />
          ) : (
            // Sign-in button label
            <Text
              style={[styles.buttonText, { color: colors.onAccent }]}
              testID="sign-in-submit-button-label"
            >              {needsNewPassword ? 'Set password' : 'Sign in'}
            </Text>
          )}
        </Pressable>
        {/* Authentication error */}
        {error ? (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.textSecondary }}
            testID="sign-in-error"
          >
            {error}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 52,
    padding: 14,
  },
  buttonText: { fontSize: 17, fontWeight: '600' },
  content: { flex: 1, gap: 16, justifyContent: 'center', padding: 24 },
  description: { fontSize: 17, lineHeight: 24 },
  dimmed: { opacity: 0.65 },
  input: { borderRadius: 12, borderWidth: 1, fontSize: 17, padding: 14 },
  screen: { flex: 1 },
  title: { fontSize: 42, fontWeight: '700' },
});
