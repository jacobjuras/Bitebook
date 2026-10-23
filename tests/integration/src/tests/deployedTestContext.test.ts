import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDeployedTestContext } from '../../deployed/testContext.js';

const cognitoMock = mockClient(CognitoIdentityProviderClient);
const dynamodbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  cognitoMock.reset();
  dynamodbMock.reset();
  vi.stubEnv('BITEBOOK_API_URL', 'https://example.execute-api.us-west-2.amazonaws.com');
  vi.stubEnv('BITEBOOK_USER_DATA_TABLE_NAME', 'UserDataTable');
  vi.stubEnv('BITEBOOK_USER_POOL_CLIENT_ID', 'client-id');
  vi.stubEnv('BITEBOOK_USER_POOL_ID', 'us-west-2_pool');
  cognitoMock.on(AdminCreateUserCommand).resolves({
    User: { Attributes: [{ Name: 'sub', Value: 'user-123' }] },
  });
  cognitoMock.on(AdminDeleteUserCommand).resolves({});
  cognitoMock.on(AdminSetUserPasswordCommand).resolves({});
  cognitoMock.on(InitiateAuthCommand).resolves({
    AuthenticationResult: { AccessToken: 'access-token' },
  });
  dynamodbMock.on(QueryCommand).resolves({ Items: [] });
  dynamodbMock.on(TransactWriteCommand).resolves({});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('deployed test context', () => {
  it('authenticates requests and cleans every paginated partition item', async () => {
    const keys = Array.from({ length: 101 }, (_, index) => ({
      entityKey: `ITEM#${index}`,
      userId: 'user-123',
    }));
    dynamodbMock.on(QueryCommand)
      .resolvesOnce({
        Items: keys.slice(0, 60),
        LastEvaluatedKey: keys[59],
      })
      .resolvesOnce({ Items: keys.slice(60) });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ foods: [] }), { status: 200 }),
    ));

    const context = await createDeployedTestContext();
    const result = await context.request('foods');
    await context.cleanup();

    expect(result.body).toEqual({ foods: [] });
    expect(cognitoMock.commandCalls(AdminCreateUserCommand)).toHaveLength(1);
    expect(cognitoMock.commandCalls(AdminDeleteUserCommand)).toHaveLength(1);
    expect(dynamodbMock.commandCalls(QueryCommand)).toHaveLength(2);
    const cleanupCalls = dynamodbMock.commandCalls(TransactWriteCommand);
    expect(cleanupCalls).toHaveLength(2);
    expect(cleanupCalls[0]?.args[0].input.TransactItems).toHaveLength(100);
    expect(cleanupCalls[1]?.args[0].input.TransactItems).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      new URL('foods', 'https://example.execute-api.us-west-2.amazonaws.com'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    );
  });

  it('deletes a temporary user when authentication setup fails', async () => {
    cognitoMock.on(AdminSetUserPasswordCommand).rejects(new Error('setup failed'));

    await expect(createDeployedTestContext()).rejects.toThrow('setup failed');

    expect(cognitoMock.commandCalls(AdminDeleteUserCommand)).toHaveLength(1);
  });

  it('attempts user deletion when partition cleanup fails', async () => {
    dynamodbMock.on(QueryCommand).rejects(new Error('cleanup failed'));
    const context = await createDeployedTestContext();

    await expect(context.cleanup()).rejects.toThrow('Deployed test cleanup failed');

    expect(cognitoMock.commandCalls(AdminDeleteUserCommand)).toHaveLength(1);
  });

  it('rejects a non-JSON API response without exposing its body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('upstream details', { status: 502 }),
    ));
    const context = await createDeployedTestContext();

    await expect(context.request('foods')).rejects.toThrow(
      'Bitebook API returned non-JSON (502)',
    );
    await context.cleanup();
  });
});
