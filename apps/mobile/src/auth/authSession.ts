import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'bitebook-auth-session';

export interface AuthTokenResponse {
  accessToken: string;
  expiresIn?: number;
  idToken?: string;
  issuedAt: number;
  refreshToken?: string;
}

export interface AuthSession {
  accessToken: string;
  expiresIn: number;
  idToken: string;
  issuedAt: number;
  refreshToken: string;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Record<string, unknown>;
  return ['accessToken', 'idToken', 'refreshToken'].every(
    (key) => typeof session[key] === 'string' && session[key].length > 0,
  ) && typeof session.expiresIn === 'number'
    && typeof session.issuedAt === 'number';
}

/** Restores Cognito tokens after validating the platform-backed stored value. */
export async function loadAuthSession(): Promise<AuthSession | null> {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;
  try {
    const session: unknown = JSON.parse(stored);
    if (isAuthSession(session)) return session;
  } catch {
    await clearAuthSession();
    return null;
  }
  await clearAuthSession();
  return null;
}

/** Validates and persists a complete Cognito session in platform-backed storage. */
export async function saveAuthSession(response: AuthTokenResponse): Promise<AuthSession> {
  const session = {
    accessToken: response.accessToken,
    expiresIn: response.expiresIn,
    idToken: response.idToken,
    issuedAt: response.issuedAt,
    refreshToken: response.refreshToken,
  };
  if (!isAuthSession(session)) {
    throw new Error('Cognito returned an incomplete authentication session');
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return session;
}

/** Removes the persisted Cognito session from platform-backed storage. */
export async function clearAuthSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
