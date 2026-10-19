import { randomUUID } from 'node:crypto';

import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { mealSchema, type Meal } from '@bitebook/domain';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { documentClient } from './dynamodb.js';
import { jsonResponse } from './http.js';

const createMealInputSchema = mealSchema.pick({
  ingredients: true,
  name: true,
});

/** Creates a Meal only when every referenced Food belongs to the user. */
export async function createMeal(
  tableName: string,
  userId: string,
  body: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> {
  let requestBody: unknown;
  try {
    requestBody = JSON.parse(body ?? '');
  } catch {
    return jsonResponse(400, { message: 'Invalid meal' });
  }

  const input = createMealInputSchema.safeParse(requestBody);
  if (!input.success) {
    return jsonResponse(400, { message: 'Invalid meal' });
  }

  const timestamp = new Date().toISOString();
  const meal: Meal = mealSchema.parse({
    ...input.data,
    createdAt: timestamp,
    id: randomUUID(),
    updatedAt: timestamp,
    userId,
  });

  try {
    await documentClient.send(
      new TransactWriteCommand({
        TransactItems: [
          ...meal.ingredients.map(({ foodId }) => ({
            ConditionCheck: {
              ConditionExpression:
                'attribute_exists(userId) AND attribute_exists(entityKey)',
              Key: { entityKey: `FOOD#${foodId}`, userId },
              TableName: tableName,
            },
          })),
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: { ...meal, entityKey: `MEAL#${meal.id}` },
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
        return failedCondition < meal.ingredients.length
          ? jsonResponse(400, { message: 'Meal contains unavailable Foods' })
          : jsonResponse(409, { message: 'Meal could not be created; try again' });
      }
    }
    throw error;
  }

  return jsonResponse(201, meal);
}
