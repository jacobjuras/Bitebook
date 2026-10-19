import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { foodSchema } from '@bitebook/domain';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { handler } from '../src/index.js';

const documentClientMock = mockClient(DynamoDBDocumentClient);
const validInput = {
  currentStock: { amount: 500, unit: 'g' },
  name: 'Oats',
  nutritionFacts: { caloriesKcal: 150, micronutrients: {} },
  servingSize: { amount: 40, unit: 'g' },
};

const storedFood = {
  ...validInput,
  createdAt: '2026-10-19T03:00:00.000Z',
  id: 'd52ee286-4771-4f70-ab5a-34a1dc071025',
  updatedAt: '2026-10-19T03:00:00.000Z',
  userId: 'user-123',
};

function createEvent(
  body: string,
  subject?: string,
  routeKey = 'POST /foods',
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    body,
    routeKey,
    requestContext: {
      authorizer: { jwt: { claims: subject ? { sub: subject } : {} } },
    },
  } as APIGatewayProxyEventV2WithJWTAuthorizer;
}

describe('handler', () => {
  beforeEach(() => {
    documentClientMock.reset();
    documentClientMock.on(PutCommand).resolves({});
    documentClientMock.on(QueryCommand).resolves({ Items: [] });
    process.env.USER_DATA_TABLE_NAME = 'UserDataTable';
  });

  afterAll(() => {
    delete process.env.USER_DATA_TABLE_NAME;
  });

  it('creates a Food owned by the authenticated user', async () => {
    const response = await handler(
      createEvent(JSON.stringify(validInput), 'user-123'),
    );
    const food = foodSchema.parse(JSON.parse(response.body ?? ''));

    expect(response.statusCode).toBe(201);
    expect(food).toMatchObject({ ...validInput, userId: 'user-123' });
    expect(food.createdAt).toBe(food.updatedAt);
    expect(documentClientMock.commandCalls(PutCommand)[0]?.args[0].input)
      .toEqual({
        ConditionExpression:
          'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
        Item: { ...food, entityKey: `FOOD#${food.id}` },
        TableName: 'UserDataTable',
      });
  });

  it('lists Foods owned by the authenticated user', async () => {
    documentClientMock.on(QueryCommand).resolves({
      Items: [{ ...storedFood, entityKey: `FOOD#${storedFood.id}` }],
    });

    const response = await handler(createEvent('', 'user-123', 'GET /foods'));

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({ 'content-type': 'application/json' });
    expect(JSON.parse(response.body ?? '')).toEqual({ foods: [storedFood] });
    expect(documentClientMock.commandCalls(QueryCommand)[0]?.args[0].input)
      .toEqual({
        ExpressionAttributeValues: {
          ':entityPrefix': 'FOOD#',
          ':userId': 'user-123',
        },
        KeyConditionExpression:
          'userId = :userId AND begins_with(entityKey, :entityPrefix)',
        TableName: 'UserDataTable',
      });
  });

  it('rejects requests without an authenticated user', async () => {
    const response = await handler(createEvent(JSON.stringify(validInput)));

    expect(response).toEqual({
      body: JSON.stringify({ message: 'Authentication required' }),
      headers: { 'content-type': 'application/json' },
      statusCode: 401,
    });
    expect(documentClientMock.calls()).toHaveLength(0);
  });

  it.each([
    ['malformed JSON', '{'],
    ['undeclared fields', JSON.stringify({ ...validInput, userId: 'attacker' })],
    ['invalid values', JSON.stringify({ ...validInput, name: '' })],
  ])('rejects %s', async (_case, body) => {
    const response = await handler(createEvent(body, 'user-123'));

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.calls()).toHaveLength(0);
  });

  it('rejects unsupported routes', async () => {
    const response = await handler(
      createEvent('', 'user-123', 'DELETE /foods'),
    );

    expect(response.statusCode).toBe(404);
    expect(documentClientMock.calls()).toHaveLength(0);
  });
});
