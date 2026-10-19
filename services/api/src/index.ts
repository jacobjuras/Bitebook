import { randomUUID } from 'node:crypto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
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
/** Creates a user-owned Food from a validated authenticated request. */
export async function handler(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> {
  const subject = event.requestContext.authorizer.jwt.claims.sub;
  if (typeof subject !== 'string' || subject.length === 0) {
    return jsonResponse(401, { message: 'Authentication required' });
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

  const tableName = process.env.USER_DATA_TABLE_NAME;
  if (!tableName) {
    throw new Error('USER_DATA_TABLE_NAME is not configured');
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
