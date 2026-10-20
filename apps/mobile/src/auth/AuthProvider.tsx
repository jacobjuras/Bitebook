import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
  type IAuthenticationCallback,
} from 'amazon-cognito-identity-js';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { getMobileConfig } from '../config/mobileConfig';
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
  type AuthSession,
} from './authSession';

const config = getMobileConfig();
const volatileValues = new Map<string, string>();
// @secure_recommendation: Cognito's internal cache is volatile; only SecureStore persists tokens.
const volatileStorage = {
  clear: () => volatileValues.clear(),
  getItem: (key: string) => volatileValues.get(key) ?? null,
  removeItem: (key: string) => void volatileValues.delete(key),
  setItem: (key: string, value: string) => void volatileValues.set(key, value),
};
const userPool = new CognitoUserPool({
  ClientId: config.userPoolClientId,
  Storage: volatileStorage,
  UserPoolId: config.userPoolId,
});

type AuthStatus =
  | 'loading'
  | 'new-password-required'
  | 'signed-in'
  | 'signed-out';
interface AuthContextValue {
  confirmNewPassword(password: string): Promise<void>;
  error: string | null;
  session: AuthSession | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  status: AuthStatus;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function awaitAuthentication(
  start: (callbacks: IAuthenticationCallback) => void,
): Promise<CognitoUserSession | null> {
  return new Promise((resolve, reject) => start({
    newPasswordRequired: () => resolve(null),
    onFailure: reject,
    onSuccess: resolve,
  }));
}

async function storeSession(session: CognitoUserSession) {
  const accessToken = session.getAccessToken();
  return saveAuthSession({
    accessToken: accessToken.getJwtToken(),
    expiresIn: accessToken.getExpiration() - accessToken.getIssuedAt(),
    idToken: session.getIdToken().getJwtToken(),
    issuedAt: accessToken.getIssuedAt(),
    refreshToken: session.getRefreshToken().getToken(),
  });
}

/** Authenticates an email and password through Cognito's SRP protocol. */
export async function signInWithPassword(email: string, password: string) {
  const username = email.trim();
  const user = new CognitoUser({ Pool: userPool, Username: username });
  const result = await awaitAuthentication((callbacks) => {
    user.authenticateUser(new AuthenticationDetails({
      Password: password,
      Username: username,
    }), callbacks);
  });
  return { session: result ? await storeSession(result) : null, user };
}

/** Completes the temporary-password challenge for an admin-created user. */
export async function completeRequiredPassword(
  user: CognitoUser,
  password: string,
) {
  const result = await awaitAuthentication((callbacks) => {
    user.completeNewPasswordChallenge(password, {}, callbacks);
  });
  if (!result) throw new Error('Unexpected password challenge');
  return storeSession(result);
}

/** Revokes the refresh token that maintains a Cognito session. */
export async function revokeAuthSession(session: AuthSession) {
  const response = await fetch(new URL('/oauth2/revoke', config.cognitoUrl), {
    body: new URLSearchParams({
      client_id: config.userPoolClientId,
      token: session.refreshToken,
    }).toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  if (!response.ok) throw new Error('Cognito token revocation failed');
}

/** Provides one first-party Cognito email session to every mobile route. */
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [pendingUser, setPendingUser] = useState<CognitoUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAuthSession().then((stored) => {
      setSession(stored);
      setStatus(stored ? 'signed-in' : 'signed-out');
    }).catch(() => {
      setError('Unable to restore the saved session');
      setStatus('signed-out');
    });
  }, []);

  async function signIn(email: string, password: string) {
    setError(null);
    setStatus('loading');
    try {
      const result = await signInWithPassword(email, password);
      if (!result.session) {
        setPendingUser(result.user);
        setStatus('new-password-required');
        return;
      }
      setSession(result.session);
      setStatus('signed-in');
    } catch {
      setError('Unable to sign in with those credentials');
      setStatus('signed-out');
    }
  }

  async function confirmNewPassword(password: string) {
    if (!pendingUser) return;
    setError(null);
    setStatus('loading');
    try {
      setSession(await completeRequiredPassword(pendingUser, password));
      setPendingUser(null);
      setStatus('signed-in');
    } catch {
      setError('Unable to set the new password');
      setStatus('new-password-required');
    }
  }

  async function signOut() {
    if (!session) return;
    setError(null);
    try {
      await revokeAuthSession(session);
      await clearAuthSession();
    } catch {
      setError('Sign out failed');
      return;
    }
    setSession(null);
    setStatus('signed-out');
  }

  return (
    <AuthContext.Provider value={{
      confirmNewPassword, error, session, signIn, signOut, status,
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
