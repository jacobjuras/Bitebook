import { randomUUID } from 'node:crypto';

import { DeleteCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { foodSchema, type Food } from '@bitebook/domain';
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';

import { adjustFoodStock } from './stockAdjustments.js';
import { documentClient } from './dynamodb.js';
import { getFood, listFoods, parseStoredFood } from './foodReads.js';
import { jsonResponse } from './http.js';

const createFoodInputSchema = foodSchema.pick({
  currentStock: true,
  name: true,
  nutritionFacts: true,
  servingSize: true,
});
const updateFoodInputSchema = createFoodInputSchema
  .omit({ currentStock: true })
  .partial()
  .refine((input) => Object.keys(input).length > 0);

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

  const fields = Object.entries({
    ...input.data,
    updatedAt: new Date().toISOString(),
  });
  const expressionAttributeNames = Object.fromEntries(
    fields.map(([name], index) => [`#field${index}`, name]),
  );
  const expressionAttributeValues = Object.fromEntries(
    fields.map(([, value], index) => [`:value${index}`, value]),
  );

  try {
    const result = await documentClient.send(
      new UpdateCommand({
        ConditionExpression:
          'attribute_exists(userId) AND attribute_exists(entityKey)',
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Key: { entityKey: `FOOD#${id.data}`, userId },
        ReturnValues: 'ALL_NEW',
        TableName: tableName,
        UpdateExpression: `SET ${fields
          .map((_, index) => `#field${index} = :value${index}`)
          .join(', ')}`,
      }),
    );

    if (!result.Attributes) {
      throw new Error('DynamoDB did not return the updated Food');
    }
    return jsonResponse(200, { food: parseStoredFood(result.Attributes) });
  } catch (error) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { message: 'Food not found' });
    }
    throw error;
  }
}

/** Handles authenticated Food API requests. */
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
  if (event.routeKey === 'POST /foods/{foodId}/stock-adjustments') {
    return adjustFoodStock(
      tableName,
      subject,
      event.pathParameters?.foodId,
      event.body,
    );
  }
  if (event.routeKey === 'PATCH /foods/{foodId}') {
    return updateFood(
      tableName,
      subject,
      event.pathParameters?.foodId,
      event.body,
    );
  }
  if (event.routeKey !== 'POST /foods') {
    return jsonResponse(404, { message: 'Not found' });
  }

  let requestBody: unknown;
  try {
    requestBody = JSON.parse(event.body ?? '');
  } catch {
    return jsonResponse(400, { message: 'Invalid food' });
  }

  const input = createFoodInputSchema.safeParse(requestBody);
  if (!input.success) {
    return jsonResponse(400, { message: 'Invalid food' });
  }

  const timestamp = new Date().toISOString();
  const food: Food = foodSchema.parse({
    ...input.data,
    createdAt: timestamp,
    id: randomUUID(),
    updatedAt: timestamp,
    userId: subject,
  });

  await documentClient.send(
    new PutCommand({
      ConditionExpression:
        'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
      Item: { ...food, entityKey: `FOOD#${food.id}` },
      TableName: tableName,
    }),
  );

  return jsonResponse(201, food);
}
