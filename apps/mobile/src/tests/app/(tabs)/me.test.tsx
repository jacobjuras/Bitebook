import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: {
    error: null as string | null,
    signOut: vi.fn(),
  },
}));

vi.mock('../../../auth/AuthProvider.js', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('~/theme', () => ({
  useThemeColors: () => ({
    background: 'background',
    control: 'control',
    textPrimary: 'text-primary',
    textSecondary: 'text-secondary',
  }),
}));

import MeScreen from '../../../app/(tabs)/me.js';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.error = null;
});

describe('Me screen', () => {
  it('renders profile context and signs out from the exact control', async () => {
    await render(<MeScreen />);

    expect(screen.getByTestId('me-tab-title')).toHaveTextContent('Me');
    expect(screen.getByTestId('me-tab-description')).toHaveTextContent(
      'Manage your profile and goals.',
    );
    const signOutButton = screen.getByTestId('me-tab-sign-out-button');
    expect(signOutButton).toHaveTextContent('Sign out');
    await fireEvent.press(signOutButton);
    expect(mocks.auth.signOut).toHaveBeenCalledOnce();
  });

  it('renders a sign-out error when authentication reports one', async () => {
    mocks.auth.error = 'Sign out failed';
    await render(<MeScreen />);

    const error = screen.getByTestId('me-tab-sign-out-error');
    expect(error).toBeTruthy();
    expect(error).toHaveTextContent('Sign out failed');
  });
});
