import { randomUUID } from 'node:crypto';

import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import {
  foodCreateInputSchema,
  foodSchema,
  type Food,
} from '@bitebook/domain';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { documentClient } from './dynamodb.js';
import { jsonResponse } from './http.js';
import {
  createTagRecord,
  getCreateTagTransactItems,
  getTagConditionChecks,
} from './tags.js';

/** Atomically creates a Food together with any new Tags attached to it. */
export async function createFood(
  tableName: string,
  userId: string,
  body: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> {
  let requestBody: unknown;
  try {
    requestBody = JSON.parse(body ?? '');
  } catch {
    return jsonResponse(400, { message: 'Invalid food' });
  }

  const input = foodCreateInputSchema.safeParse(requestBody);
  if (!input.success) {
    return jsonResponse(400, { message: 'Invalid food' });
  }

  const timestamp = new Date().toISOString();
  const {
    newTags: newTagInputs = [],
    tagIds: existingTagIds = [],
    ...foodInput
  } = input.data;
  const newTags = newTagInputs.map((tagInput) =>
    createTagRecord(userId, tagInput, timestamp),
  );
  const tagIds = [
    ...existingTagIds,
    ...newTags.map(({ id }) => id),
  ];
  const food: Food = foodSchema.parse({
    ...foodInput,
    ...(tagIds.length > 0 ? { tagIds } : {}),
    createdAt: timestamp,
    id: randomUUID(),
    updatedAt: timestamp,
    userId,
  });
  const existingTagChecks = getTagConditionChecks(
    tableName,
    userId,
    existingTagIds,
  );
  const newTagWrites = newTags.flatMap((tag) =>
    getCreateTagTransactItems(tableName, tag),
  );

  try {
    await documentClient.send(
      new TransactWriteCommand({
        TransactItems: [
          ...existingTagChecks,
          ...newTagWrites,
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: { ...food, entityKey: `FOOD#${food.id}` },
              TableName: tableName,
            },
          },
        ],
      }),
    );
  } catch (error) {
    if (error instanceof TransactionCanceledException) {
      const failedCondition = error.CancellationReasons?.findIndex(
        ({ Code }) => Code === 'ConditionalCheckFailed',
      );
      if (failedCondition !== undefined && failedCondition >= 0) {
        if (failedCondition < existingTagChecks.length) {
          return jsonResponse(400, { message: 'Food contains unavailable Tags' });
        }
        const newTagActionIndex = failedCondition - existingTagChecks.length;
        if (
          newTagActionIndex >= 0
          && newTagActionIndex < newTagWrites.length
          && newTagActionIndex % 2 === 1
        ) {
          return jsonResponse(409, {
            message: 'A Tag with this name already exists',
          });
        }
        return jsonResponse(409, { message: 'Food could not be created; try again' });
      }
    }
    throw error;
  }

  return jsonResponse(201, food);
}
