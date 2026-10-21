import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { foodSchema, type Food } from '@bitebook/domain';

import { documentClient } from './dynamodb.js';

/** Validates a DynamoDB Food item and returns its domain fields. */
export function parseStoredFood(item: Record<string, unknown>): Food {
  const { entityKey } = item;
  if (typeof entityKey !== 'string' || !entityKey.startsWith('FOOD#')) {
    throw new Error('Stored Food has an invalid entity key');
  }

  const food = { ...item };
  delete food.entityKey;
  delete food.currentStock;
  return foodSchema.parse(food);
}

/** Retrieves one Food from an authenticated user's partition. */
export async function getFood(
  tableName: string,
  userId: string,
  foodId: string,
  consistentRead = false,
): Promise<Food | undefined> {
  const result = await documentClient.send(
    new GetCommand({
      ...(consistentRead ? { ConsistentRead: true } : {}),
      Key: { entityKey: `FOOD#${foodId}`, userId },
      TableName: tableName,
    }),
  );

  return result.Item ? parseStoredFood(result.Item) : undefined;
}

/** Queries and validates Food records in one authenticated user's partition. */
export async function listFoods(
  tableName: string,
  userId: string,
): Promise<Food[]> {
  const result = await documentClient.send(
    new QueryCommand({
      ExpressionAttributeValues: {
        ':entityPrefix': 'FOOD#',
        ':userId': userId,
      },
      KeyConditionExpression:
        'userId = :userId AND begins_with(entityKey, :entityPrefix)',
      TableName: tableName,
    }),
  );

  return (result.Items ?? []).map(parseStoredFood);
}
