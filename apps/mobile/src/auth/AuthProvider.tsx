import {
  exchangeCodeAsync,
  ResponseType,
  revokeAsync,
  useAuthRequest,
  type DiscoveryDocument,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
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

const CALLBACK_URL = 'bitebook://auth/callback';
const SIGN_OUT_URL = 'bitebook://auth/signout';
const config = getMobileConfig();
const discovery: DiscoveryDocument = {
  authorizationEndpoint: new URL('/oauth2/authorize', config.cognitoUrl).href,
  revocationEndpoint: new URL('/oauth2/revoke', config.cognitoUrl).href,
  tokenEndpoint: new URL('/oauth2/token', config.cognitoUrl).href,
};

WebBrowser.maybeCompleteAuthSession();

/** Exchanges a Cognito authorization code using its matching PKCE verifier. */
export async function exchangeAuthorizationCode(code: string, verifier: string) {
  const response = await exchangeCodeAsync({
    clientId: config.userPoolClientId,
    code,
    extraParams: { code_verifier: verifier },
    redirectUri: CALLBACK_URL,
  }, discovery);
  return saveAuthSession(response);
}

/** Revokes a Cognito refresh token before removing the local session. */
export async function revokeAuthSession(session: AuthSession) {
  await revokeAsync({
    clientId: config.userPoolClientId,
    token: session.refreshToken,
  }, discovery);
}

function createSignOutUrl() {
  const url = new URL('/logout', config.cognitoUrl);
  url.searchParams.set('client_id', config.userPoolClientId);
  url.searchParams.set('logout_uri', SIGN_OUT_URL);
  return url.href;
}

type AuthStatus = 'loading' | 'signed-in' | 'signed-out';
interface AuthContextValue {
  error: string | null;
  session: AuthSession | null;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  status: AuthStatus;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Provides one Cognito session and sign-in lifecycle to every mobile route. */
export function AuthProvider({ children }: PropsWithChildren) {
  const [request, , promptAsync] = useAuthRequest({
    clientId: config.userPoolClientId,
    redirectUri: CALLBACK_URL,
    responseType: ResponseType.Code,
    scopes: ['openid', 'email'],
    usePKCE: true,
  }, discovery);
  const [session, setSession] = useState<AuthSession | null>(null);
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

  async function signIn() {
    if (!request?.codeVerifier) return;
    setError(null);
    try {
      const result = await promptAsync();
      if (result.type !== 'success' || !result.params.code) return;
      setSession(await exchangeAuthorizationCode(
        result.params.code,
        request.codeVerifier,
      ));
      setStatus('signed-in');
    } catch {
      setError('Sign in failed');
    }
  }

  async function signOut() {
    if (!session) return;
    setError(null);
    try {
      await revokeAuthSession(session);
      await clearAuthSession();
      setSession(null);
      setStatus('signed-out');
      await WebBrowser.openAuthSessionAsync(createSignOutUrl(), SIGN_OUT_URL);
    } catch {
      setError('Sign out failed');
    }
  }

  return (
    <AuthContext.Provider value={{ error, session, signIn, signOut, status }}>
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
