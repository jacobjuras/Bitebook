import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthProvider';
import { AuthStatus } from '../auth/AuthStatus';
import { useThemeColors } from '~/theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function triggerValidationFeedback(shake: Animated.Value) {
  shake.stopAnimation();
  shake.setValue(0);
  Animated.sequence([
    Animated.timing(shake, { duration: 40, toValue: -4, useNativeDriver: true }),
    Animated.timing(shake, { duration: 40, toValue: 4, useNativeDriver: true }),
    Animated.timing(shake, { duration: 40, toValue: -2, useNativeDriver: true }),
    Animated.timing(shake, { duration: 40, toValue: 2, useNativeDriver: true }),
    Animated.timing(shake, { duration: 40, toValue: 0, useNativeDriver: true }),
  ]).start();
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/** Presents first-party Cognito authentication before the tabbed app is available. */
export default function SignInScreen() {
  const colors = useThemeColors();
  const { clearError, confirmNewPassword, error, signIn, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasValidatedEmail, setHasValidatedEmail] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const emailShake = useRef(new Animated.Value(0)).current;
  const needsNewPassword = status === AuthStatus.NewPasswordRequired;
  const isLoading = status === AuthStatus.Loading;
  const hasValidEmail = EMAIL_PATTERN.test(email.trim());
  const hasEmailValue = email.trim().length > 0;
  const showEmailError = hasValidatedEmail && hasEmailValue && !hasValidEmail;
  const isDisabled =
    isLoading
    || !password
    || (!needsNewPassword && !hasValidEmail);

  async function submit() {
    if (isDisabled) {
      return;
    }

    if (needsNewPassword) {
      await confirmNewPassword(password);
      return;
    }
    await signIn(email.trim(), password);
  }

  function validateEmail() {
    setHasValidatedEmail(true);
    if (hasEmailValue && !hasValidEmail) {
      triggerValidationFeedback(emailShake);
    }
  }

  function updateEmail(value: string) {
    clearError();
    setEmail(value);
  }

  function updatePassword(value: string) {
    clearError();
    setPassword(value);
  }

  function showUnavailableAlert(feature: string) {
    Alert.alert(`${feature} is not available yet`);
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.screen}
        testID="sign-in-keyboard-avoiding-view"
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          style={styles.screen}
          testID="sign-in-scroll-view"
        >
          {/* Header spacing */}
          <View style={styles.headerSpacer} testID="sign-in-header-spacer" />
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Bitebook</Text>
            <Text
              style={[styles.description, { color: colors.textSecondary }]}
              testID="sign-in-instructions"
            >
              {needsNewPassword
                ? 'Choose a permanent password to finish signing in.'
                : 'Plan and track every bite.'}
            </Text>
            {!needsNewPassword ? (
              <>
                <View style={styles.socialButtons} testID="sign-in-social-buttons">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => showUnavailableAlert('Apple sign-in')}
                    style={({ pressed }) => [
                      styles.socialButton,
                      { borderColor: colors.border },
                      pressed && styles.dimmed,
                    ]}
                    testID="sign-in-apple-button"
                  >
                    <Ionicons
                      color={colors.textPrimary}
                      name="logo-apple"
                      size={22}
                      style={styles.logo}
                      testID="sign-in-apple-logo"
                    />
                    <Text style={[styles.socialButtonText, { color: colors.textPrimary }]}>Continue with Apple</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => showUnavailableAlert('Google sign-in')}
                    style={({ pressed }) => [
                      styles.socialButton,
                      { borderColor: colors.border },
                      pressed && styles.dimmed,
                    ]}
                    testID="sign-in-google-button"
                  >
                    <Ionicons color={colors.textPrimary} name="logo-google" size={22} />
                    <Text style={[styles.socialButtonText, { color: colors.textPrimary }]}>Continue with Google</Text>
                  </Pressable>
                </View>
                <View style={styles.divider} testID="sign-in-divider">
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>
                <View style={styles.field}>
                  <Animated.View
                    style={{ transform: [{ translateX: emailShake }] }}
                    testID="sign-in-email-input-container"
                  >
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      onBlur={validateEmail}
                      onChangeText={updateEmail}
                      onFocus={() => setHasValidatedEmail(false)}
                      placeholder="Email address"
                      style={[
                        styles.input,
                        {
                          borderColor: showEmailError ? colors.danger : colors.border,
                          color: colors.textPrimary,
                        },
                      ]}
                      testID="sign-in-email-input"
                      value={email}
                    />
                  </Animated.View>
                  {showEmailError ? (
                    <View
                      style={[styles.errorMessage, { backgroundColor: colors.dangerSubtle }]}
                      testID="sign-in-email-error"
                    >
                      <Text
                        accessibilityRole="alert"
                        style={[styles.errorText, { color: colors.danger }]}
                      >
                        Invalid email address
                      </Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}
            <View style={styles.field} testID="sign-in-password-field">
              <View
                style={[styles.passwordInput, { borderColor: colors.border }]}
                testID="sign-in-password-input-container"
              >
                <TextInput
                  autoCapitalize="none"
                  autoComplete={needsNewPassword ? 'new-password' : 'current-password'}
                  onChangeText={updatePassword}
                  onSubmitEditing={() => void submit()}
                  placeholder={needsNewPassword ? 'New password' : 'Password'}
                  secureTextEntry={!isPasswordVisible}
                  style={[styles.passwordTextInput, { color: colors.textPrimary }]}
                  testID="sign-in-password-input"
                  value={password}
                />
                <Pressable
                  accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                  onPress={() => setIsPasswordVisible((visible) => !visible)}
                  style={styles.passwordVisibilityButton}
                  testID="sign-in-password-visibility-button"
                >
                  <Ionicons
                    color={colors.textSecondary}
                    name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                  />
                </Pressable>
              </View>
              {error ? (
                <View
                  style={[styles.errorMessage, { backgroundColor: colors.dangerSubtle }]}
                  testID="sign-in-error"
                >
                  <Text
                    accessibilityRole="alert"
                    style={[styles.errorText, { color: colors.danger }]}
                  >
                    {error}
                  </Text>
                </View>
              ) : null}
            </View>
            {!needsNewPassword ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => showUnavailableAlert('Password reset')}
                style={styles.forgotPasswordButton}
                testID="sign-in-forgot-password-button"
              >
                <Text style={[styles.linkText, { color: colors.accent }]}>Forgot password?</Text>
              </Pressable>
            ) : null}
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
                <ActivityIndicator color={colors.onAccent} testID="sign-in-loading-indicator" />
              ) : (
                <Text
                  style={[styles.buttonText, { color: colors.onAccent }]}
                  testID="sign-in-submit-button-label"
                >
                  {needsNewPassword ? 'Set password' : 'Sign in'}
                </Text>
              )}
            </Pressable>
            {!needsNewPassword ? (
              <View style={styles.signUpPrompt} testID="sign-in-sign-up-prompt">
                <Text style={{ color: colors.textPrimary }}>Don&apos;t have an account? </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => showUnavailableAlert('Sign up')}
                  testID="sign-in-sign-up-button"
                >
                  <Text style={[styles.linkText, { color: colors.accent }]}>Sign up</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  logo: { transform: [{ translateY: -1 }] },
  button: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 52,
    padding: 14,
  },
  buttonText: { fontSize: 17, fontWeight: '600' },
  content: { gap: 16, padding: 24 },
  description: { fontSize: 17, lineHeight: 24 },
  dimmed: { opacity: 0.65 },
  divider: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 13, fontWeight: '600' },
  errorMessage: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  errorText: { fontSize: 13, lineHeight: 18 },
  field: { gap: 6 },
  forgotPasswordButton: { alignSelf: 'flex-end', marginTop: -8 },
  headerSpacer: { height: '10%' },
  input: { borderRadius: 12, borderWidth: 1, fontSize: 17, padding: 14 },
  linkText: { fontWeight: '600' },
  passwordInput: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
  },
  passwordTextInput: { flex: 1, fontSize: 17, padding: 14 },
  passwordVisibilityButton: { padding: 14 },
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  signUpPrompt: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  socialButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
    padding: 14,
  },
  socialButtonText: { fontSize: 17, fontWeight: '600' },
  socialButtons: { gap: 12 },
  title: { fontSize: 42, fontWeight: '700' },
});
