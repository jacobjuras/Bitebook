import { randomUUID } from 'node:crypto';

import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { mealSchema, type Meal } from '@bitebook/domain';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { documentClient } from './dynamodb.js';
import { jsonResponse } from './http.js';
import { getMeal } from './mealReads.js';

const createMealInputSchema = mealSchema.pick({
  ingredients: true,
  name: true,
});
const updateMealInputSchema = createMealInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0);


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

/** Updates a Meal without accepting stale writes or unowned Food references. */
export async function updateMeal(
  tableName: string,
  userId: string,
  mealId: string | undefined,
  body: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> {
  const id = mealSchema.shape.id.safeParse(mealId);
  if (!id.success) {
    return jsonResponse(400, { message: 'Invalid Meal ID' });
  }

  let requestBody: unknown;
  try {
    requestBody = JSON.parse(body ?? '');
  } catch {
    return jsonResponse(400, { message: 'Invalid meal' });
  }
  const input = updateMealInputSchema.safeParse(requestBody);
  if (!input.success) {
    return jsonResponse(400, { message: 'Invalid meal' });
  }

  const currentMeal = await getMeal(tableName, userId, id.data, true);
  if (!currentMeal) {
    return jsonResponse(404, { message: 'Meal not found' });
  }

  const updatedMeal = mealSchema.parse({
    ...currentMeal,
    ...input.data,
    updatedAt: new Date().toISOString(),
  });
  const ingredientChecks = input.data.ingredients?.map(({ foodId }) => ({
    ConditionCheck: {
      ConditionExpression:
        'attribute_exists(userId) AND attribute_exists(entityKey)',
      Key: { entityKey: `FOOD#${foodId}`, userId },
      TableName: tableName,
    },
  })) ?? [];

  try {
    await documentClient.send(
      new TransactWriteCommand({
        TransactItems: [
          ...ingredientChecks,
          {
            Put: {
              ConditionExpression: 'updatedAt = :expectedUpdatedAt',
              ExpressionAttributeValues: {
                ':expectedUpdatedAt': currentMeal.updatedAt,
              },
              Item: { ...updatedMeal, entityKey: `MEAL#${updatedMeal.id}` },
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
        return failedCondition < ingredientChecks.length
          ? jsonResponse(400, { message: 'Meal contains unavailable Foods' })
          : jsonResponse(409, { message: 'Meal changed; try again' });
      }
    }
    throw error;
  }

  return jsonResponse(200, updatedMeal);
}

/** Deletes one Meal from an authenticated user's partition. */
export async function deleteMeal(
  tableName: string,
  userId: string,
  mealId: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> {
  const id = mealSchema.shape.id.safeParse(mealId);
  if (!id.success) {
    return jsonResponse(400, { message: 'Invalid Meal ID' });
  }

  try {
    await documentClient.send(
      new DeleteCommand({
        ConditionExpression:
          'attribute_exists(userId) AND attribute_exists(entityKey)',
        Key: { entityKey: `MEAL#${id.data}`, userId },
        TableName: tableName,
      }),
    );
    return { statusCode: 204 };
  } catch (error) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { message: 'Meal not found' });
    }
    throw error;
  }
}
