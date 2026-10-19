import { randomUUID } from 'node:crypto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { foodSchema, type Food } from '@bitebook/domain';
import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';

const createFoodInputSchema = foodSchema.pick({
  currentStock: true,
  name: true,
  nutritionFacts: true,
  servingSize: true,
});
const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function jsonResponse(
  statusCode: number,
  body: unknown,
): APIGatewayProxyStructuredResultV2 {
  return {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    statusCode,
  };
}
/** Validates a DynamoDB Food item and returns its domain fields. */
function parseStoredFood(item: Record<string, unknown>): Food {
  const { entityKey, ...food } = item;
  if (typeof entityKey !== 'string' || !entityKey.startsWith('FOOD#')) {
    throw new Error('Stored Food has an invalid entity key');
  }

  return foodSchema.parse(food);
}

/** Retrieves and validates one Food from an authenticated user's partition. */
async function getFood(
  tableName: string,
  userId: string,
  foodId: string | undefined,
): Promise<APIGatewayProxyStructuredResultV2> {
  const id = foodSchema.shape.id.safeParse(foodId);
  if (!id.success) {
    return jsonResponse(400, { message: 'Invalid Food ID' });
  }

  const result = await documentClient.send(
    new GetCommand({
      Key: { entityKey: `FOOD#${id.data}`, userId },
      TableName: tableName,
    }),
  );

  if (!result.Item) {
    return jsonResponse(404, { message: 'Food not found' });
  }

  return jsonResponse(200, { food: parseStoredFood(result.Item) });
}

/** Queries and validates Food records in one authenticated user's partition. */
async function listFoods(
  tableName: string,
  userId: string,
): Promise<APIGatewayProxyStructuredResultV2> {
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

  return jsonResponse(200, {
    foods: (result.Items ?? []).map(parseStoredFood),
  });
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

  if (event.routeKey === 'GET /foods/{foodId}') {
    return getFood(tableName, subject, event.pathParameters?.foodId);
  }
  if (event.routeKey === 'GET /foods') {
    return listFoods(tableName, subject);
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
