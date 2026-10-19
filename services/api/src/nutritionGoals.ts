import { randomUUID } from 'node:crypto';

import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  localDateSchema,
  nutritionGoalSchema,
  type NutritionGoal,
} from '@bitebook/domain';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { documentClient } from './dynamodb.js';
import { jsonResponse } from './http.js';

const createNutritionGoalInputSchema = nutritionGoalSchema.pick({
  caloriesKcal: true,
  effectiveFrom: true,
});

/** Validates a DynamoDB NutritionGoal item and returns its domain fields. */
function parseStoredNutritionGoal(
  item: Record<string, unknown>,
): NutritionGoal {
  const { entityKey, ...goal } = item;
  if (
    typeof entityKey !== 'string' ||
    !entityKey.startsWith('NUTRITION_GOAL#')
  ) {
    throw new Error('Stored NutritionGoal has an invalid entity key');
  }
  return nutritionGoalSchema.parse(goal);
}

/** Creates one effective-dated NutritionGoal for the authenticated user. */
export async function createNutritionGoal(
  tableName: string,
  userId: string,
  body: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> {
  let requestBody: unknown;
  try {
    requestBody = JSON.parse(body ?? '');
  } catch {
    return jsonResponse(400, { message: 'Invalid nutrition goal' });
  }
  const input = createNutritionGoalInputSchema.safeParse(requestBody);
  if (!input.success) {
    return jsonResponse(400, { message: 'Invalid nutrition goal' });
  }

  const goal = nutritionGoalSchema.parse({
    ...input.data,
    createdAt: new Date().toISOString(),
    id: randomUUID(),
    userId,
  });
  try {
    await documentClient.send(
      new PutCommand({
        ConditionExpression:
          'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
        Item: {
          ...goal,
          entityKey: `NUTRITION_GOAL#${goal.effectiveFrom}`,
        },
        TableName: tableName,
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return jsonResponse(409, {
        message: 'A nutrition goal already begins on that date',
      });
    }
    throw error;
  }

  return jsonResponse(201, goal);
}

/** Finds the latest NutritionGoal effective on or before a local date. */
export async function getEffectiveNutritionGoal(
  tableName: string,
  userId: string,
  localDate: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> {
  const date = localDateSchema.safeParse(localDate);
  if (!date.success) {
    return jsonResponse(400, { message: 'Invalid date' });
  }

  const result = await documentClient.send(
    new QueryCommand({
      ExpressionAttributeValues: {
        ':firstGoal': 'NUTRITION_GOAL#',
        ':lastGoal': `NUTRITION_GOAL#${date.data}`,
        ':userId': userId,
      },
      KeyConditionExpression:
        'userId = :userId AND entityKey BETWEEN :firstGoal AND :lastGoal',
      Limit: 1,
      ScanIndexForward: false,
      TableName: tableName,
    }),
  );
  const goal = result.Items?.[0];

  return goal
    ? jsonResponse(200, { goal: parseStoredNutritionGoal(goal) })
    : jsonResponse(404, { message: 'Nutrition goal not found' });
}
