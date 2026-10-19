import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mealSchema, type Meal } from '@bitebook/domain';

import { documentClient } from './dynamodb.js';

/** Validates a DynamoDB Meal item and returns its domain fields. */
export function parseStoredMeal(item: Record<string, unknown>): Meal {
  const { entityKey, ...meal } = item;
  if (typeof entityKey !== 'string' || !entityKey.startsWith('MEAL#')) {
    throw new Error('Stored Meal has an invalid entity key');
  }

  return mealSchema.parse(meal);
}

/** Retrieves one Meal from an authenticated user's partition. */
export async function getMeal(
  tableName: string,
  userId: string,
  mealId: string,
): Promise<Meal | undefined> {
  const result = await documentClient.send(
    new GetCommand({
      Key: { entityKey: `MEAL#${mealId}`, userId },
      TableName: tableName,
    }),
  );

  return result.Item ? parseStoredMeal(result.Item) : undefined;
}

/** Queries and validates Meal records in one authenticated user's partition. */
export async function listMeals(
  tableName: string,
  userId: string,
): Promise<Meal[]> {
  const result = await documentClient.send(
    new QueryCommand({
      ExpressionAttributeValues: {
        ':entityPrefix': 'MEAL#',
        ':userId': userId,
      },
      KeyConditionExpression:
        'userId = :userId AND begins_with(entityKey, :entityPrefix)',
      TableName: tableName,
    }),
  );

  return (result.Items ?? []).map(parseStoredMeal);
}
