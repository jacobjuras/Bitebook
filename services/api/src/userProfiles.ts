import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { userProfileSchema, type UserProfile } from '@bitebook/domain';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { documentClient } from './dynamodb.js';
import { jsonResponse } from './http.js';

const profileInputSchema = userProfileSchema.pick({
  displayName: true,
  timeZone: true,
});

/** Validates a DynamoDB profile item and returns its domain fields. */
function parseStoredProfile(item: Record<string, unknown>): UserProfile {
  const { entityKey, ...profile } = item;
  if (entityKey !== 'PROFILE') {
    throw new Error('Stored profile has an invalid entity key');
  }
  return userProfileSchema.parse(profile);
}

/** Retrieves the authenticated user's Bitebook profile. */
export async function getUserProfile(
  tableName: string,
  userId: string,
): Promise<APIGatewayProxyStructuredResultV2> {
  const result = await documentClient.send(
    new GetCommand({
      Key: { entityKey: 'PROFILE', userId },
      TableName: tableName,
    }),
  );

  return result.Item
    ? jsonResponse(200, { profile: parseStoredProfile(result.Item) })
    : jsonResponse(404, { message: 'Profile not found' });
}

/** Creates or replaces the authenticated user's Bitebook profile fields. */
export async function putUserProfile(
  tableName: string,
  userId: string,
  body: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> {
  let requestBody: unknown;
  try {
    requestBody = JSON.parse(body ?? '');
  } catch {
    return jsonResponse(400, { message: 'Invalid profile' });
  }
  const input = profileInputSchema.safeParse(requestBody);
  if (!input.success) {
    return jsonResponse(400, { message: 'Invalid profile' });
  }

  const timestamp = new Date().toISOString();
  const expressionAttributeNames = {
    '#displayName': 'displayName',
    '#timeZone': 'timeZone',
  };
  const expressionAttributeValues: Record<string, unknown> = {
    ':createdAt': timestamp,
    ':timeZone': input.data.timeZone,
    ':updatedAt': timestamp,
  };
  if (input.data.displayName !== undefined) {
    expressionAttributeValues[':displayName'] = input.data.displayName;
  }

  const result = await documentClient.send(
    new UpdateCommand({
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      Key: { entityKey: 'PROFILE', userId },
      ReturnValues: 'ALL_NEW',
      TableName: tableName,
      UpdateExpression: input.data.displayName === undefined
        ? 'SET createdAt = if_not_exists(createdAt, :createdAt), #timeZone = :timeZone, updatedAt = :updatedAt REMOVE #displayName'
        : 'SET createdAt = if_not_exists(createdAt, :createdAt), #displayName = :displayName, #timeZone = :timeZone, updatedAt = :updatedAt',
    }),
  );
  if (!result.Attributes) {
    throw new Error('DynamoDB did not return the updated profile');
  }

  return jsonResponse(200, { profile: parseStoredProfile(result.Attributes) });
}
