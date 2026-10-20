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
import { useThemeColors } from '../theme/useThemeColors';

/** Presents first-party Cognito authentication before the tabbed app is available. */
export default function SignInScreen() {
  const colors = useThemeColors();
  const { confirmNewPassword, error, signIn, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const needsNewPassword = status === 'new-password-required';
  const isLoading = status === 'loading';
  const isDisabled = isLoading || !password || (!needsNewPassword && !email.trim());

  async function submit() {
    const submittedPassword = password;
    setPassword('');

    if (needsNewPassword) {
      await confirmNewPassword(submittedPassword);
      return;
    }
    await signIn(email, submittedPassword);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Bitebook</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {needsNewPassword
            ? 'Choose a permanent password to finish signing in.'
            : 'Sign in to access your foods, meals, goals, and reports.'}
        </Text>
        {!needsNewPassword ? (
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email address"
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
            value={email}
          />
        ) : null}
        <TextInput
          autoCapitalize="none"
          autoComplete={needsNewPassword ? 'new-password' : 'current-password'}
          onChangeText={setPassword}
          onSubmitEditing={() => void submit()}
          placeholder={needsNewPassword ? 'New password' : 'Password'}
          secureTextEntry
          style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
          value={password}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled }}
          disabled={isDisabled}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.accent },
            (pressed || isDisabled) && styles.dimmed,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.onAccent }]}>
              {needsNewPassword ? 'Set password' : 'Sign in'}
            </Text>
          )}
        </Pressable>
        {error ? (
          <Text accessibilityRole="alert" style={{ color: colors.textSecondary }}>
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
