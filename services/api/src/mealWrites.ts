import { randomUUID } from 'node:crypto';

import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { mealSchema, type Meal } from '@bitebook/domain';
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

import { documentClient } from './dynamodb.js';
import { jsonResponse } from './http.js';
import { getMeal } from './mealReads.js';
import { getTagConditionChecks } from './tags.js';

const mealInputFieldsSchema = mealSchema.pick({
  ingredients: true,
  isFavorite: true,
  name: true,
  tagIds: true,
});
const createMealInputSchema = mealInputFieldsSchema.refine(
  ({ ingredients, tagIds }) => ingredients.length + (tagIds?.length ?? 0) <= 99,
  'A Meal can have at most 99 combined Food and Tag references',
);
const updateMealInputSchema = mealInputFieldsSchema
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
          ...getTagConditionChecks(tableName, userId, meal.tagIds),
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
        if (failedCondition < meal.ingredients.length) {
          return jsonResponse(400, { message: 'Meal contains unavailable Foods' });
        }
        if (
          failedCondition
          < meal.ingredients.length + (meal.tagIds?.length ?? 0)
        ) {
          return jsonResponse(400, { message: 'Meal contains unavailable Tags' });
        }
        return jsonResponse(409, { message: 'Meal could not be created; try again' });
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
  if (
    updatedMeal.ingredients.length + (updatedMeal.tagIds?.length ?? 0) > 99
  ) {
    return jsonResponse(400, { message: 'Invalid meal' });
  }
  const ingredientChecks = input.data.ingredients?.map(({ foodId }) => ({
    ConditionCheck: {
      ConditionExpression:
        'attribute_exists(userId) AND attribute_exists(entityKey)',
      Key: { entityKey: `FOOD#${foodId}`, userId },
      TableName: tableName,
    },
  })) ?? [];
  const tagChecks = input.data.tagIds === undefined
    ? []
    : getTagConditionChecks(tableName, userId, updatedMeal.tagIds);

  try {
    await documentClient.send(
      new TransactWriteCommand({
        TransactItems: [
          ...ingredientChecks,
          ...tagChecks,
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
        if (failedCondition < ingredientChecks.length) {
          return jsonResponse(400, { message: 'Meal contains unavailable Foods' });
        }
        if (failedCondition < ingredientChecks.length + tagChecks.length) {
          return jsonResponse(400, { message: 'Meal contains unavailable Tags' });
        }
        return jsonResponse(409, { message: 'Meal changed; try again' });
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
