import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStatus } from '../../auth/AuthStatus.js';

const mocks = vi.hoisted(() => ({
  auth: {
    confirmNewPassword: vi.fn(),
    error: null as string | null,
    signIn: vi.fn(),
    status: 'signed-out',
  },
}));

vi.mock('../../auth/AuthProvider.js', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('../../theme/useThemeColors.js', () => ({
  useThemeColors: () => ({
    accent: 'accent',
    background: 'background',
    border: 'border',
    onAccent: 'on-accent',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import SignInScreen from '../../app/sign-in.js';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.error = null;
  mocks.auth.status = AuthStatus.SignedOut;
});

describe('Sign In screen', () => {
  it('requires an email and a non-empty password', async () => {
    await render(<SignInScreen />);
    const submitButton = screen.getByTestId('sign-in-submit-button');
    expect(screen.getByTestId('sign-in-instructions')).toHaveTextContent(
      'Sign in to access your foods, meals, goals, and reports.',
    );
    expect(screen.getByTestId('sign-in-submit-button-label')).toHaveTextContent(
      'Sign in',
    );

    expect(submitButton.props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByTestId('sign-in-email-input'), 'user@example.com');
    expect(submitButton.props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId('sign-in-password-input'), 'short');
    expect(submitButton.props.accessibilityState.disabled).toBe(false);
  });

  it('submits email and password, then clears the password', async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('sign-in-email-input'), 'user@example.com');
    await fireEvent.changeText(screen.getByTestId('sign-in-password-input'), 'password');

    await fireEvent.press(screen.getByTestId('sign-in-submit-button'));

    expect(mocks.auth.signIn).toHaveBeenCalledWith('user@example.com', 'password');
    expect(screen.getByTestId('sign-in-password-input').props.value).toBe('');
  });

  it('submits through the password keyboard action', async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('sign-in-email-input'), 'user@example.com');
    await fireEvent.changeText(screen.getByTestId('sign-in-password-input'), 'password');

    await fireEvent(
      screen.getByTestId('sign-in-password-input'),
      'submitEditing',
    );

    expect(mocks.auth.signIn).toHaveBeenCalledWith('user@example.com', 'password');
  });

  it('renders and completes the required-password challenge', async () => {
    mocks.auth.status = AuthStatus.NewPasswordRequired;
    await render(<SignInScreen />);

    expect(screen.queryByTestId('sign-in-email-input')).toBeNull();
    expect(screen.getByTestId('sign-in-instructions')).toHaveTextContent(
      'Choose a permanent password to finish signing in.',
    );
    expect(screen.getByTestId('sign-in-submit-button-label')).toHaveTextContent(
      'Set password',
    );
    await fireEvent.changeText(screen.getByTestId('sign-in-password-input'), 'new-password');
    await fireEvent.press(screen.getByTestId('sign-in-submit-button'));

    expect(mocks.auth.confirmNewPassword).toHaveBeenCalledWith('new-password');
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

  it('renders the current authentication error', async () => {
    mocks.auth.error = 'Unable to sign in';
    await render(<SignInScreen />);

    const error = screen.getByTestId('sign-in-error');
    expect(error).toBeTruthy();
    expect(error).toHaveTextContent('Unable to sign in');
  });
});
