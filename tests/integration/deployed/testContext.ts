import { randomUUID } from 'node:crypto';

import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';

import { getDeployedApiUrl } from '../src/config.js';

const DYNAMODB_TRANSACTION_ITEM_LIMIT = 100;

export interface DeployedTestContext {
  cleanup: () => Promise<void>;
  request: (
    path: string,
    method?: string,
    body?: unknown,
  ) => Promise<{ body: unknown; response: Response }>;
  runId: string;
  userId: string;
}

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function chunks<Item>(items: readonly Item[], size: number): Item[][] {
  return Array.from(
    { length: Math.ceil(items.length / size) },
    (_, index) => items.slice(index * size, (index + 1) * size),
  );
}

async function deleteUserPartition(
  client: DynamoDBDocumentClient,
  tableName: string,
  userId: string | undefined,
): Promise<void> {
  if (!userId) return;

  const keys: Record<string, unknown>[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await client.send(new QueryCommand({
      ConsistentRead: true,
      ExclusiveStartKey: exclusiveStartKey,
      ExpressionAttributeValues: { ':userId': userId },
      KeyConditionExpression: 'userId = :userId',
      ProjectionExpression: 'userId, entityKey',
      TableName: tableName,
    }));
    keys.push(...(page.Items ?? []));
    exclusiveStartKey = page.LastEvaluatedKey;
  } while (exclusiveStartKey);

  for (const keyBatch of chunks(keys, DYNAMODB_TRANSACTION_ITEM_LIMIT)) {
    await client.send(new TransactWriteCommand({
      TransactItems: keyBatch.map(({ entityKey }) => ({
        Delete: { Key: { entityKey, userId }, TableName: tableName },
      })),
    }));
  }
}

/** Creates an authenticated deployed-test user with isolated, self-cleaning data. */
export async function createDeployedTestContext(): Promise<DeployedTestContext> {
  const apiUrl = getDeployedApiUrl();
  const clientId = requireEnvironment('BITEBOOK_USER_POOL_CLIENT_ID');
  const tableName = requireEnvironment('BITEBOOK_USER_DATA_TABLE_NAME');
  const userPoolId = requireEnvironment('BITEBOOK_USER_POOL_ID');
  const cognito = new CognitoIdentityProviderClient({});
  const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const runId = randomUUID().slice(0, 8);
  const username = `bitebook-integ-${runId}@example.com`;
  const password = `Bb1!${randomUUID()}`;
  let accessToken: string | undefined;
  let userCreated = false;
  let userId: string | undefined;

  async function cleanup() {
    const results = await Promise.allSettled([
      deleteUserPartition(dynamodb, tableName, userId),
      userCreated
        ? cognito.send(new AdminDeleteUserCommand({
          UserPoolId: userPoolId,
          Username: username,
        }))
        : Promise.resolve(),
    ]);
    userCreated = false;
    cognito.destroy();
    dynamodb.destroy();

    const failures = results.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    );
    if (failures.length > 0) {
      throw new AggregateError(failures, 'Deployed test cleanup failed');
    }
  }

  try {
    const created = await cognito.send(new AdminCreateUserCommand({
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email', Value: username },
        { Name: 'email_verified', Value: 'true' },
      ],
      UserPoolId: userPoolId,
      Username: username,
    }));
    userCreated = true;
    userId = created.User?.Attributes?.find(({ Name }) => Name === 'sub')?.Value;
    if (!userId) throw new Error('Temporary test user has no Cognito subject');

    await cognito.send(new AdminSetUserPasswordCommand({
      Password: password,
      Permanent: true,
      UserPoolId: userPoolId,
      Username: username,
    }));
    const auth = await cognito.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { PASSWORD: password, USERNAME: username },
      ClientId: clientId,
    }));
    accessToken = auth.AuthenticationResult?.AccessToken;
    if (!accessToken) throw new Error('Temporary test user could not authenticate');
  } catch (error) {
    try {
      await cleanup();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Test setup and cleanup failed');
    }
    throw error;
  }

  return {
    cleanup,
    request: async (path, method = 'GET', body) => {
      const response = await fetch(new URL(path, apiUrl), {
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        method,
        signal: AbortSignal.timeout(10_000),
      });
      const responseText = await response.text();
      let responseBody: unknown;
      try {
        responseBody = JSON.parse(responseText);
      } catch {
        throw new Error(`Bitebook API returned non-JSON (${response.status})`);
      }
      return { body: responseBody, response };
    },
    runId,
    userId,
  };
}
