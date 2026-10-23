import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { foodSchema, mealSchema } from '@bitebook/domain';
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';

import { documentClient } from './dynamodb.js';
import { createFood } from './foodWrites.js';
import { getFood, listFoods } from './foodReads.js';
import { jsonResponse } from './http.js';
import { getMeal, listMeals } from './mealReads.js';
import { createMeal, deleteMeal, updateMeal } from './mealWrites.js';
import {
  createNutritionGoal,
  deleteNutritionGoal,
  getEffectiveNutritionGoal,
  replaceFutureNutritionGoal,
} from './nutritionGoals.js';
import { getUserProfile, putUserProfile } from './userProfiles.js';
import { createTag, getTagConditionChecks, listTags, updateTag } from './tags.js';

const updateFoodInputSchema = foodSchema.pick({
  isFavorite: true,
  name: true,
  nutritionFacts: true,
  servingSize: true,
  tagIds: true,
}).partial().refine((input) => Object.keys(input).length > 0);

/** Deletes one Food from an authenticated user's partition. */
async function deleteFood(
  tableName: string,
  userId: string,
  foodId: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> {
  const id = foodSchema.shape.id.safeParse(foodId);
  if (!id.success) {
    return jsonResponse(400, { message: 'Invalid Food ID' });
  }

  try {
    await documentClient.send(
      new DeleteCommand({
        ConditionExpression:
          'attribute_exists(userId) AND attribute_exists(entityKey)',
        Key: { entityKey: `FOOD#${id.data}`, userId },
        TableName: tableName,
      }),
    );
    return { statusCode: 204 };
  } catch (error) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { message: 'Food not found' });
    }
    throw error;
  }
}

/** Updates mutable metadata on one authenticated user's Food. */
async function updateFood(
  tableName: string,
  userId: string,
  foodId: string | undefined,
  body: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> {
  const id = foodSchema.shape.id.safeParse(foodId);
  if (!id.success) {
    return jsonResponse(400, { message: 'Invalid Food ID' });
  }

  let requestBody: unknown;
  try {
    requestBody = JSON.parse(body ?? '');
  } catch {
    return jsonResponse(400, { message: 'Invalid food' });
  }

  const input = updateFoodInputSchema.safeParse(requestBody);
  if (!input.success) {
    return jsonResponse(400, { message: 'Invalid food' });
  }

  const currentFood = await getFood(tableName, userId, id.data, true);
  if (!currentFood) {
    return jsonResponse(404, { message: 'Food not found' });
  }
  const updatedFood = foodSchema.parse({
    ...currentFood,
    ...input.data,
    updatedAt: new Date().toISOString(),
  });
  const tagChecks = input.data.tagIds === undefined
    ? []
    : getTagConditionChecks(tableName, userId, updatedFood.tagIds);

  try {
    await documentClient.send(
      new TransactWriteCommand({
        TransactItems: [
          ...tagChecks,
          {
            Put: {
              ConditionExpression: 'updatedAt = :expectedUpdatedAt',
              ExpressionAttributeValues: {
                ':expectedUpdatedAt': currentFood.updatedAt,
              },
              Item: { ...updatedFood, entityKey: `FOOD#${updatedFood.id}` },
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
        return failedCondition < tagChecks.length
          ? jsonResponse(400, { message: 'Food contains unavailable Tags' })
          : jsonResponse(409, { message: 'Food changed; try again' });
      }
    }
    throw error;
  }

  return jsonResponse(200, { food: updatedFood });
}

/** Handles authenticated Bitebook API requests. */
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> {
  const subject = event.requestContext.authorizer.jwt.claims.sub;
  if (typeof subject !== 'string' || subject.length === 0) {
    return jsonResponse(401, { message: 'Authentication required' });
  }

  const tableName = process.env.USER_DATA_TABLE_NAME;
  if (!tableName) {
    throw new Error('USER_DATA_TABLE_NAME is not configured');
  }

  if (event.routeKey === 'GET /tags') {
    return jsonResponse(200, { tags: await listTags(tableName, subject) });
  }
  if (event.routeKey === 'POST /tags') {
    return createTag(tableName, subject, event.body);
  }
  if (event.routeKey === 'PATCH /tags/{tagId}') {
    return updateTag(
      tableName,
      subject,
      event.pathParameters?.tagId,
      event.body,
    );
  }
  if (event.routeKey === 'GET /nutrition-goals/effective') {
    return getEffectiveNutritionGoal(
      tableName,
      subject,
      event.queryStringParameters?.date,
    );
  }
  if (event.routeKey === 'DELETE /nutrition-goals/{effectiveFrom}') {
    return deleteNutritionGoal(
      tableName,
      subject,
      event.pathParameters?.effectiveFrom,
    );
  }
  if (event.routeKey === 'PUT /nutrition-goals/{effectiveFrom}') {
    return replaceFutureNutritionGoal(
      tableName,
      subject,
      event.pathParameters?.effectiveFrom,
      event.body,
    );
  }
  if (event.routeKey === 'POST /nutrition-goals') {
    return createNutritionGoal(tableName, subject, event.body);
  }
  if (event.routeKey === 'GET /profile') {
    return getUserProfile(tableName, subject);
  }
  if (event.routeKey === 'PUT /profile') {
    return putUserProfile(tableName, subject, event.body);
  }
  if (event.routeKey === 'DELETE /meals/{mealId}') {
    return deleteMeal(tableName, subject, event.pathParameters?.mealId);
  }
  if (event.routeKey === 'GET /meals/{mealId}') {
    const id = mealSchema.shape.id.safeParse(event.pathParameters?.mealId);
    if (!id.success) {
      return jsonResponse(400, { message: 'Invalid Meal ID' });
    }

    const meal = await getMeal(tableName, subject, id.data);
    return meal
      ? jsonResponse(200, { meal })
      : jsonResponse(404, { message: 'Meal not found' });
  }
  if (event.routeKey === 'GET /meals') {
    return jsonResponse(200, { meals: await listMeals(tableName, subject) });
  }
  if (event.routeKey === 'PATCH /meals/{mealId}') {
    return updateMeal(
      tableName,
      subject,
      event.pathParameters?.mealId,
      event.body,
    );
  }
  if (event.routeKey === 'POST /meals') {
    return createMeal(tableName, subject, event.body);
  }
  if (event.routeKey === 'DELETE /foods/{foodId}') {
    return deleteFood(tableName, subject, event.pathParameters?.foodId);
  }
  if (event.routeKey === 'GET /foods/{foodId}') {
    const id = foodSchema.shape.id.safeParse(event.pathParameters?.foodId);
    if (!id.success) {
      return jsonResponse(400, { message: 'Invalid Food ID' });
    }

    const food = await getFood(tableName, subject, id.data);
    return food
      ? jsonResponse(200, { food })
      : jsonResponse(404, { message: 'Food not found' });
  }
  if (event.routeKey === 'GET /foods') {
    return jsonResponse(200, { foods: await listFoods(tableName, subject) });
  }
  if (event.routeKey === 'PATCH /foods/{foodId}') {
    return updateFood(
      tableName,
      subject,
      event.pathParameters?.foodId,
      event.body,
    );
  }
  if (event.routeKey === 'POST /foods') {
    return createFood(tableName, subject, event.body);
  }
  return jsonResponse(404, { message: 'Not found' });
}
