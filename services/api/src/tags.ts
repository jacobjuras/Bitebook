import { randomUUID } from 'node:crypto';

import {
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  normalizeTagName,
  tagCreateInputSchema,
  tagSchema,
  tagUpdateInputSchema,
  type Tag,
} from '@bitebook/domain';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { documentClient } from './dynamodb.js';
import { jsonResponse } from './http.js';

function tagNameEntityKey(name: string): string {
  return `TAG_NAME#${name}`;
}

/** Builds transactional checks that require every Tag to belong to the user. */
export function getTagConditionChecks(
  tableName: string,
  userId: string,
  tagIds: readonly string[] | undefined,
) {
  return (tagIds ?? []).map((tagId) => ({
    ConditionCheck: {
      ConditionExpression:
        'attribute_exists(userId) AND attribute_exists(entityKey)',
      Key: { entityKey: `TAG#${tagId}`, userId },
      TableName: tableName,
    },
  }));
}

/** Validates a DynamoDB Tag item and returns its domain fields. */
export function parseStoredTag(item: Record<string, unknown>): Tag {
  const { entityKey, ...tag } = item;
  if (typeof entityKey !== 'string' || !entityKey.startsWith('TAG#')) {
    throw new Error('Stored Tag has an invalid entity key');
  }
  return tagSchema.parse(tag);
}

/** Queries all durable Tags owned by one authenticated user. */
export async function listTags(
  tableName: string,
  userId: string,
): Promise<Tag[]> {
  const result = await documentClient.send(
    new QueryCommand({
      ExpressionAttributeValues: {
        ':entityPrefix': 'TAG#',
        ':userId': userId,
      },
      KeyConditionExpression:
        'userId = :userId AND begins_with(entityKey, :entityPrefix)',
      TableName: tableName,
    }),
  );

  return (result.Items ?? [])
    .map(parseStoredTag)
    .sort((first, second) =>
      first.normalizedName.localeCompare(second.normalizedName),
    );
}

/** Creates a durable user-owned Tag with a case-insensitive unique name. */
export async function createTag(
  tableName: string,
  userId: string,
  body: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> {
  let requestBody: unknown;
  try {
    requestBody = JSON.parse(body ?? '');
  } catch {
    return jsonResponse(400, { message: 'Invalid tag' });
  }

  const input = tagCreateInputSchema.safeParse(requestBody);
  if (!input.success) {
    return jsonResponse(400, { message: 'Invalid tag' });
  }

  const timestamp = new Date().toISOString();
  const tag = tagSchema.parse({
    ...input.data,
    createdAt: timestamp,
    id: randomUUID(),
    normalizedName: normalizeTagName(input.data.name),
    updatedAt: timestamp,
    userId,
  });

  try {
    await documentClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: { ...tag, entityKey: `TAG#${tag.id}` },
              TableName: tableName,
            },
          },
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: {
                entityKey: tagNameEntityKey(tag.normalizedName),
                tagId: tag.id,
                userId,
              },
              TableName: tableName,
            },
          },
        ],
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'TransactionCanceledException') {
      return jsonResponse(409, { message: 'A Tag with this name already exists' });
    }
    throw error;
  }

  return jsonResponse(201, tag);
}

/** Updates editable Tag metadata while preserving stable references. */
export async function updateTag(
  tableName: string,
  userId: string,
  tagId: string | undefined,
  body: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> {
  const id = tagSchema.shape.id.safeParse(tagId);
  if (!id.success) {
    return jsonResponse(400, { message: 'Invalid Tag ID' });
  }

  let requestBody: unknown;
  try {
    requestBody = JSON.parse(body ?? '');
  } catch {
    return jsonResponse(400, { message: 'Invalid tag' });
  }
  const input = tagUpdateInputSchema.safeParse(requestBody);
  if (!input.success) {
    return jsonResponse(400, { message: 'Invalid tag' });
  }

  const result = await documentClient.send(
    new GetCommand({
      ConsistentRead: true,
      Key: { entityKey: `TAG#${id.data}`, userId },
      TableName: tableName,
    }),
  );
  if (!result.Item) {
    return jsonResponse(404, { message: 'Tag not found' });
  }

  const currentTag = parseStoredTag(result.Item);
  const updatedTag = tagSchema.parse({
    ...currentTag,
    ...input.data,
    normalizedName: input.data.name === undefined
      ? currentTag.normalizedName
      : normalizeTagName(input.data.name),
    updatedAt: new Date().toISOString(),
  });
  const normalizedNameChanged =
    updatedTag.normalizedName !== currentTag.normalizedName;

  try {
    await documentClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              ConditionExpression: 'updatedAt = :expectedUpdatedAt',
              ExpressionAttributeValues: {
                ':expectedUpdatedAt': currentTag.updatedAt,
              },
              Item: { ...updatedTag, entityKey: `TAG#${updatedTag.id}` },
              TableName: tableName,
            },
          },
          ...(normalizedNameChanged ? [
            {
              Delete: {
                ConditionExpression: 'tagId = :tagId',
                ExpressionAttributeValues: { ':tagId': updatedTag.id },
                Key: {
                  entityKey: tagNameEntityKey(currentTag.normalizedName),
                  userId,
                },
                TableName: tableName,
              },
            },
            {
              Put: {
                ConditionExpression:
                  'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
                Item: {
                  entityKey: tagNameEntityKey(updatedTag.normalizedName),
                  tagId: updatedTag.id,
                  userId,
                },
                TableName: tableName,
              },
            },
          ] : []),
        ],
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'TransactionCanceledException') {
      return jsonResponse(409, {
        message: 'The Tag changed or its new name is already used',
      });
    }
    throw error;
  }

  return jsonResponse(200, { tag: updatedTag });
}
