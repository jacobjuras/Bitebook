export const MOBILE_STAGES = ['local', 'beta', 'production'] as const;

export type MobileStage = (typeof MOBILE_STAGES)[number];

export interface MobileEnvironment {
  EXPO_PUBLIC_BITEBOOK_API_URL?: string;
  EXPO_PUBLIC_BITEBOOK_COGNITO_REGION?: string;
  EXPO_PUBLIC_BITEBOOK_COGNITO_URL?: string;
  EXPO_PUBLIC_BITEBOOK_STAGE?: string;
  EXPO_PUBLIC_BITEBOOK_USER_POOL_CLIENT_ID?: string;
  EXPO_PUBLIC_BITEBOOK_USER_POOL_ID?: string;
}

export interface MobileConfig {
  apiUrl: URL;
  cognitoRegion: string;
  cognitoUrl: URL;
  stage: MobileStage;
  userPoolClientId: string;
  userPoolId: string;
}

const runtimeEnvironment: MobileEnvironment = {
  EXPO_PUBLIC_BITEBOOK_API_URL: process.env.EXPO_PUBLIC_BITEBOOK_API_URL,
  EXPO_PUBLIC_BITEBOOK_COGNITO_REGION:
    process.env.EXPO_PUBLIC_BITEBOOK_COGNITO_REGION,
  EXPO_PUBLIC_BITEBOOK_COGNITO_URL:
    process.env.EXPO_PUBLIC_BITEBOOK_COGNITO_URL,
  EXPO_PUBLIC_BITEBOOK_STAGE: process.env.EXPO_PUBLIC_BITEBOOK_STAGE,
  EXPO_PUBLIC_BITEBOOK_USER_POOL_CLIENT_ID:
    process.env.EXPO_PUBLIC_BITEBOOK_USER_POOL_CLIENT_ID,
  EXPO_PUBLIC_BITEBOOK_USER_POOL_ID:
    process.env.EXPO_PUBLIC_BITEBOOK_USER_POOL_ID,
};

function requireValue(
  environment: MobileEnvironment,
  name: keyof MobileEnvironment,
): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function parseStage(value: string): MobileStage {
  if (MOBILE_STAGES.some((stage) => stage === value)) {
    return value as MobileStage;
  }
  throw new Error(
    'EXPO_PUBLIC_BITEBOOK_STAGE must be local, beta, or production',
  );
}

function parseApiUrl(value: string, stage: MobileStage): URL {
  const url = new URL(value);
  const isLoopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
  if (url.protocol !== 'https:' && !(stage === 'local' && isLoopback)) {
    throw new Error('Bitebook API URLs must use HTTPS outside local loopback');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Bitebook API URLs cannot contain credentials, queries, or fragments');
  }
  return url;
}

function parseCognitoUrl(value: string, cognitoRegion: string): URL {
  const url = new URL(value);
  const expectedSuffix = `.auth.${cognitoRegion}.amazoncognito.com`;
  if (
    url.protocol !== 'https:'
    || !url.hostname.endsWith(expectedSuffix)
    || url.port
    || url.pathname !== '/'
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new Error('The Cognito URL must be the configured Region\'s HTTPS managed domain');
  }
  return url;
}

/** Reads and validates the public API and Cognito settings embedded in a mobile build. */
export function getMobileConfig(
  environment: MobileEnvironment = runtimeEnvironment,
): MobileConfig {
  const stage = parseStage(requireValue(
    environment,
    'EXPO_PUBLIC_BITEBOOK_STAGE',
  ));
  const cognitoRegion = requireValue(
    environment,
    'EXPO_PUBLIC_BITEBOOK_COGNITO_REGION',
  );
  const userPoolId = requireValue(
    environment,
    'EXPO_PUBLIC_BITEBOOK_USER_POOL_ID',
  );

  if (!userPoolId.startsWith(`${cognitoRegion}_`)) {
    throw new Error('The Cognito User Pool must belong to the configured Region');
  }

  return {
    apiUrl: parseApiUrl(
      requireValue(environment, 'EXPO_PUBLIC_BITEBOOK_API_URL'),
      stage,
    ),
    cognitoRegion,
    cognitoUrl: parseCognitoUrl(
      requireValue(environment, 'EXPO_PUBLIC_BITEBOOK_COGNITO_URL'),
      cognitoRegion,
    ),
    stage,
    userPoolClientId: requireValue(
      environment,
      'EXPO_PUBLIC_BITEBOOK_USER_POOL_CLIENT_ID',
    ),
    userPoolId,
  };
}
