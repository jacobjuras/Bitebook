import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import {
  Alert,
  Animated,
  Platform,
  StyleSheet,
} from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStatus } from '../../auth/AuthStatus.js';

const mocks = vi.hoisted(() => ({
  auth: {
    clearError: vi.fn(),
    confirmNewPassword: vi.fn(),
    error: null as string | null,
    signIn: vi.fn(),
    status: 'signed-out',
  },
  haptic: vi.fn(() => Promise.resolve()),
  startAnimation: vi.fn(),
}));

vi.mock('@expo/vector-icons/Ionicons', () => ({ default: 'Ionicons' }));
vi.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Error: 'error' },
  notificationAsync: mocks.haptic,
}));
vi.mock('../../auth/AuthProvider.js', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    accent: 'accent',
    background: 'background',
    border: 'border',
    danger: 'danger',
    dangerSubtle: 'danger-subtle',
    onAccent: 'on-accent',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import SignInScreen from '../../app/sign-in.js';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.spyOn(Animated, 'sequence').mockReturnValue({
    start: mocks.startAnimation,
  } as never);
  mocks.auth.error = null;
  mocks.auth.status = AuthStatus.SignedOut;
});

describe('Sign In screen', () => {
  it('renders keyboard-aware sign-in methods and instructions', async () => {
    await render(<SignInScreen />);

    expect(
      screen.getByTestId('sign-in-keyboard-avoiding-view').props.behavior,
    ).toBe(Platform.OS === 'ios' ? 'padding' : 'height');
    expect(screen.getByTestId('sign-in-scroll-view').props).toMatchObject({
      keyboardDismissMode: Platform.OS === 'ios' ? 'interactive' : 'on-drag',
      keyboardShouldPersistTaps: 'handled',
    });
    expect(
      StyleSheet.flatten(
        screen.getByTestId('sign-in-scroll-view').props.contentContainerStyle,
      ),
    ).toMatchObject({ flexGrow: 1 });
    expect(StyleSheet.flatten(screen.getByTestId('sign-in-header-spacer').props.style))
      .toMatchObject({ height: '10%' });
    expect(screen.getByTestId('sign-in-instructions')).toHaveTextContent(
      'Plan and track every bite.',
    );
    expect(screen.getByTestId('sign-in-social-buttons')).toBeTruthy();
    expect(screen.getByTestId('sign-in-apple-button')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('sign-in-apple-logo').props.style))
      .toMatchObject({ transform: [{ translateY: -1 }] });
    expect(screen.getByTestId('sign-in-google-button')).toBeTruthy();
    expect(screen.getByTestId('sign-in-divider')).toBeTruthy();
    expect(screen.queryByTestId('sign-in-email-error')).toBeNull();
    expect(screen.queryByTestId('sign-in-error')).toBeNull();
    expect(screen.getByTestId('sign-in-forgot-password-button')).toBeTruthy();
    expect(screen.getByTestId('sign-in-sign-up-prompt')).toHaveTextContent(
      "Don't have an account? Sign up",
    );
  });

  it('does not mark a blank email as invalid after blur', async () => {
    await render(<SignInScreen />);
    const emailInput = screen.getByTestId('sign-in-email-input');

    await fireEvent(emailInput, 'focus');
    await fireEvent(emailInput, 'blur');

    expect(screen.queryByTestId('sign-in-email-error')).toBeNull();
    expect(StyleSheet.flatten(emailInput.props.style)).toMatchObject({
      borderColor: 'border',
    });
    expect(mocks.startAnimation).not.toHaveBeenCalled();
    expect(mocks.haptic).not.toHaveBeenCalled();
  });

  it('marks an invalid email only after the input loses focus', async () => {
    await render(<SignInScreen />);
    const emailInput = screen.getByTestId('sign-in-email-input');

    await fireEvent(emailInput, 'focus');
    await fireEvent.changeText(emailInput, 'not-an-email');
    await fireEvent.changeText(screen.getByTestId('sign-in-password-input'), 'password');

    expect(screen.queryByTestId('sign-in-email-error')).toBeNull();
    expect(StyleSheet.flatten(emailInput.props.style)).toMatchObject({
      borderColor: 'border',
    });

    await fireEvent(emailInput, 'blur');

    expect(mocks.startAnimation).toHaveBeenCalledOnce();
    expect(mocks.haptic).toHaveBeenCalledWith('error');
    expect(StyleSheet.flatten(screen.getByTestId('sign-in-email-input').props.style))
      .toMatchObject({ borderColor: 'danger' });
    expect(screen.getByTestId('sign-in-email-error')).toHaveTextContent(
      'Invalid email address',
    );
    expect(StyleSheet.flatten(screen.getByTestId('sign-in-email-error').props.style))
      .toMatchObject({ backgroundColor: 'danger-subtle' });
    expect(
      screen.getByTestId('sign-in-submit-button').props.accessibilityState.disabled,
    ).toBe(true);
    await fireEvent(screen.getByTestId('sign-in-password-input'), 'submitEditing');
    expect(mocks.auth.signIn).not.toHaveBeenCalled();

    await fireEvent(screen.getByTestId('sign-in-email-input'), 'focus');
    await fireEvent.changeText(
      screen.getByTestId('sign-in-email-input'),
      'user@example.com',
    );

    expect(StyleSheet.flatten(screen.getByTestId('sign-in-email-input').props.style))
      .toMatchObject({ borderColor: 'border' });
    expect(screen.queryByTestId('sign-in-email-error')).toBeNull();
  });

  it('allows a non-empty password through to Cognito', async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('sign-in-email-input'), 'user@example.com');
    await fireEvent.changeText(screen.getByTestId('sign-in-password-input'), 'short');

    expect(
      screen.getByTestId('sign-in-submit-button').props.accessibilityState.disabled,
    ).toBe(false);
    await fireEvent(screen.getByTestId('sign-in-password-input'), 'submitEditing');

    expect(mocks.auth.signIn).toHaveBeenCalledWith('user@example.com', 'short');
  });

  it('submits a trimmed email and preserves the password', async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('sign-in-email-input'), ' user@example.com ');
    await fireEvent.changeText(screen.getByTestId('sign-in-password-input'), 'password');

    await fireEvent.press(screen.getByTestId('sign-in-submit-button'));

    expect(mocks.auth.signIn).toHaveBeenCalledWith('user@example.com', 'password');
    expect(screen.getByTestId('sign-in-password-input').props.value).toBe('password');
  });

  it('submits through the password keyboard action', async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('sign-in-email-input'), 'user@example.com');
    await fireEvent.changeText(screen.getByTestId('sign-in-password-input'), 'password');

    await fireEvent(screen.getByTestId('sign-in-password-input'), 'submitEditing');

    expect(mocks.auth.signIn).toHaveBeenCalledWith('user@example.com', 'password');
  });

  it('toggles password visibility', async () => {
    await render(<SignInScreen />);

    expect(screen.getByTestId('sign-in-password-input').props.secureTextEntry).toBe(true);
    expect(
      screen.getByTestId('sign-in-password-visibility-button').props.accessibilityLabel,
    ).toBe('Show password');

    await fireEvent.press(screen.getByTestId('sign-in-password-visibility-button'));

    expect(screen.getByTestId('sign-in-password-input').props.secureTextEntry).toBe(false);
    expect(
      screen.getByTestId('sign-in-password-visibility-button').props.accessibilityLabel,
    ).toBe('Hide password');
  });

  it.each([
    ['sign-in-apple-button', 'Apple sign-in is not available yet'],
    ['sign-in-google-button', 'Google sign-in is not available yet'],
    ['sign-in-forgot-password-button', 'Password reset is not available yet'],
    ['sign-in-sign-up-button', 'Sign up is not available yet'],
  ])('alerts when %s is pressed', async (testId, message) => {
    const alert = vi.spyOn(Alert, 'alert');
    await render(<SignInScreen />);

    await fireEvent.press(screen.getByTestId(testId));

    expect(alert).toHaveBeenCalledWith(message);
  });

  it('submits a non-empty permanent password for the password challenge', async () => {
    mocks.auth.status = AuthStatus.NewPasswordRequired;
    await render(<SignInScreen />);

    expect(screen.queryByTestId('sign-in-email-input')).toBeNull();
    expect(screen.queryByTestId('sign-in-social-buttons')).toBeNull();
    expect(screen.queryByTestId('sign-in-forgot-password-button')).toBeNull();
    expect(screen.queryByTestId('sign-in-sign-up-prompt')).toBeNull();
    expect(screen.getByTestId('sign-in-instructions')).toHaveTextContent(
      'Choose a permanent password to finish signing in.',
    );
    expect(screen.getByTestId('sign-in-submit-button-label').props.children).toBe(
      'Set password',
    );

    await fireEvent.changeText(screen.getByTestId('sign-in-password-input'), 'short');
    await fireEvent.press(screen.getByTestId('sign-in-submit-button'));

    expect(mocks.auth.confirmNewPassword).toHaveBeenCalledWith('short');
    expect(mocks.auth.signIn).not.toHaveBeenCalled();
  });

  it('disables submission and renders progress while authentication is loading', async () => {
    mocks.auth.status = AuthStatus.Loading;
    await render(<SignInScreen />);

    expect(
      screen.getByTestId('sign-in-submit-button').props.accessibilityState.disabled,
    ).toBe(true);
    expect(screen.getByTestId('sign-in-loading-indicator')).toBeTruthy();
  });

  it('clears invalid credentials when either field is edited', async () => {
    mocks.auth.error = 'Invalid email and password combination';
    await render(<SignInScreen />);

    await fireEvent.changeText(screen.getByTestId('sign-in-email-input'), 'user@example.com');
    expect(mocks.auth.clearError).toHaveBeenCalledOnce();

    mocks.auth.clearError.mockClear();
    await fireEvent.changeText(screen.getByTestId('sign-in-password-input'), 'password');
    expect(mocks.auth.clearError).toHaveBeenCalledOnce();
  });

  it('renders invalid credentials below the password input', async () => {
    mocks.auth.error = 'Invalid email and password combination';
    await render(<SignInScreen />);

    const error = within(screen.getByTestId('sign-in-password-field'))
      .getByTestId('sign-in-error');
    expect(mocks.startAnimation).not.toHaveBeenCalled();
    expect(mocks.haptic).not.toHaveBeenCalled();
    expect(error).toHaveTextContent('Invalid email and password combination');
    expect(StyleSheet.flatten(error.props.style)).toMatchObject({
      backgroundColor: 'danger-subtle',
    });
  });
});
