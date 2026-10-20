import { describe, expect, it } from 'vitest';

import {
  getMobileConfig,
  type MobileEnvironment,
} from '../src/config/mobileConfig.js';

const validEnvironment: MobileEnvironment = {
  EXPO_PUBLIC_BITEBOOK_API_URL: 'https://api.example.com',
  EXPO_PUBLIC_BITEBOOK_COGNITO_REGION: 'us-west-2',
  EXPO_PUBLIC_BITEBOOK_COGNITO_URL:
    'https://bitebook-beta.auth.us-west-2.amazoncognito.com',
  EXPO_PUBLIC_BITEBOOK_STAGE: 'beta',
  EXPO_PUBLIC_BITEBOOK_USER_POOL_CLIENT_ID: 'client123',
  EXPO_PUBLIC_BITEBOOK_USER_POOL_ID: 'us-west-2_pool123',
};

describe('getMobileConfig', () => {
  it('resolves public Beta configuration', () => {
    expect(getMobileConfig(validEnvironment)).toEqual({
      apiUrl: new URL('https://api.example.com'),
      cognitoRegion: 'us-west-2',
      cognitoUrl: new URL(
        'https://bitebook-beta.auth.us-west-2.amazoncognito.com',
      ),
      stage: 'beta',
      userPoolClientId: 'client123',
      userPoolId: 'us-west-2_pool123',
    });
  });

  it('accepts Production configuration', () => {
    expect(getMobileConfig({
      ...validEnvironment,
      EXPO_PUBLIC_BITEBOOK_STAGE: 'production',
    }).stage).toBe('production');
  });

  it('accepts HTTP only for local loopback', () => {
    expect(getMobileConfig({
      ...validEnvironment,
      EXPO_PUBLIC_BITEBOOK_API_URL: 'http://127.0.0.1:3000',
      EXPO_PUBLIC_BITEBOOK_STAGE: 'local',
    }).apiUrl).toEqual(new URL('http://127.0.0.1:3000'));

    expect(() => getMobileConfig({
      ...validEnvironment,
      EXPO_PUBLIC_BITEBOOK_API_URL: 'http://api.example.com',
      EXPO_PUBLIC_BITEBOOK_STAGE: 'local',
    })).toThrow('must use HTTPS');
  });

  it('rejects unknown stages', () => {
    expect(() => getMobileConfig({
      ...validEnvironment,
      EXPO_PUBLIC_BITEBOOK_STAGE: 'staging',
    })).toThrow('must be local, beta, or production');
  });

  it('rejects missing values', () => {
    expect(() => getMobileConfig({
      ...validEnvironment,
      EXPO_PUBLIC_BITEBOOK_API_URL: undefined,
    })).toThrow('EXPO_PUBLIC_BITEBOOK_API_URL is required');
  });

  it('rejects unsafe API URLs', () => {
    for (const apiUrl of [
      'https://user:password@api.example.com',
      'https://api.example.com?token=value',
      'https://api.example.com#fragment',
    ]) {
      expect(() => getMobileConfig({
        ...validEnvironment,
        EXPO_PUBLIC_BITEBOOK_API_URL: apiUrl,
      })).toThrow('cannot contain credentials, queries, or fragments');
    }
  });

  it('requires the User Pool to match the configured Region', () => {
    expect(() => getMobileConfig({
      ...validEnvironment,
      EXPO_PUBLIC_BITEBOOK_USER_POOL_ID: 'us-east-1_pool123',
    })).toThrow('must belong to the configured Region');
  });

  it('requires the HTTPS Cognito managed domain for the configured Region', () => {
    for (const cognitoUrl of [
      'http://bitebook-beta.auth.us-west-2.amazoncognito.com',
      'https://bitebook-beta.auth.us-east-1.amazoncognito.com',
      'https://bitebook-beta.auth.us-west-2.amazoncognito.com:8443',
      'https://bitebook-beta.auth.us-west-2.amazoncognito.com/oauth2/authorize',
    ]) {
      expect(() => getMobileConfig({
        ...validEnvironment,
        EXPO_PUBLIC_BITEBOOK_COGNITO_URL: cognitoUrl,
      })).toThrow('must be the configured Region\'s HTTPS managed domain');
    }
  });
});
