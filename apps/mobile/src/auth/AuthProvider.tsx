import { Amplify } from 'aws-amplify';
import {
  confirmSignIn,
  fetchAuthSession,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  type SignInOutput,
} from 'aws-amplify/auth';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { getMobileConfig } from '../config/mobileConfig';
import { secureTokenStorage } from './secureTokenStorage';

const config = getMobileConfig();
Amplify.configure({
  Auth: {
    Cognito: {
      loginWith: { email: true },
      userPoolClientId: config.userPoolClientId,
      userPoolId: config.userPoolId,
    },
  },
});
cognitoUserPoolsTokenProvider.setKeyValueStorage(secureTokenStorage);

export type AuthStatus =
  | 'loading'
  | 'new-password-required'
  | 'signed-in'
  | 'signed-out';

/** Maps supported Cognito sign-in results to Bitebook authentication states. */
export function resolveSignInStatus(result: SignInOutput): AuthStatus {
  if (result.isSignedIn) return 'signed-in';
  if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
    return 'new-password-required';
  }
  throw new Error(`Unsupported Cognito sign-in step: ${result.nextStep.signInStep}`);
}

/** Starts Cognito SRP authentication for a Bitebook email account. */
export async function signInWithPassword(email: string, password: string) {
  return resolveSignInStatus(await amplifySignIn({
    options: { authFlowType: 'USER_SRP_AUTH' },
    password,
    username: email.trim(),
  }));
}

/** Completes the required-password challenge for an admin-created user. */
export async function completeRequiredPassword(password: string) {
  return resolveSignInStatus(await confirmSignIn({ challengeResponse: password }));
}

/** Revokes the Cognito session and removes its stored tokens. */
export async function endAuthSession() {
  await amplifySignOut();
}

interface AuthContextValue {
  confirmNewPassword(password: string): Promise<void>;
  error: string | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  status: AuthStatus;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Provides one first-party Cognito authentication lifecycle to every route. */
export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuthSession().then(({ tokens }) => {
      setStatus(tokens ? 'signed-in' : 'signed-out');
    }).catch(() => {
      setError('Unable to restore the saved session');
      setStatus('signed-out');
    });
  }, []);

  async function signIn(email: string, password: string) {
    setError(null);
    setStatus('loading');
    try {
      setStatus(await signInWithPassword(email, password));
    } catch {
      setError('Unable to sign in with those credentials');
      setStatus('signed-out');
    }
  }

  async function confirmNewPassword(password: string) {
    setError(null);
    setStatus('loading');
    try {
      setStatus(await completeRequiredPassword(password));
    } catch {
      setError('Unable to set the new password');
      setStatus('new-password-required');
    }
  }

  async function signOut() {
    setError(null);
    setStatus('loading');
    try {
      await endAuthSession();
      setStatus('signed-out');
    } catch {
      setError('Sign out failed');
      setStatus('signed-in');
    }
  }

  return (
    <AuthContext.Provider value={{
      confirmNewPassword, error, signIn, signOut, status,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Returns the shared mobile authentication state and operations. */
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used within AuthProvider');
  return auth;
}
