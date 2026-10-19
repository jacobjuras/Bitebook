import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { nutritionGoalSchema } from '@bitebook/domain';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { handler } from '../src/index.js';

const documentClientMock = mockClient(DynamoDBDocumentClient);
const goalInput = {
  caloriesKcal: 2_200,
  effectiveFrom: '2026-10-19',
};
const storedGoal = {
  ...goalInput,
  createdAt: '2026-10-19T18:00:00.000Z',
  id: 'd4d194e1-df1e-47ea-a57a-f42b0aa9dcd2',
  userId: 'user-123',
};

function createEvent(
  routeKey: string,
  body?: string,
  date?: string,
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    body,
    queryStringParameters: date ? { date } : undefined,
    routeKey,
    requestContext: {
      authorizer: { jwt: { claims: { sub: 'user-123' } } },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

describe('NutritionGoal routes', () => {
  beforeEach(() => {
    documentClientMock.reset();
    documentClientMock.on(PutCommand).resolves({});
    documentClientMock.on(QueryCommand).resolves({ Items: [] });
    process.env.USER_DATA_TABLE_NAME = 'UserDataTable';
  });

  afterAll(() => {
    delete process.env.USER_DATA_TABLE_NAME;
  });

  it('creates one goal for an effective date', async () => {
    const response = await handler(
      createEvent('POST /nutrition-goals', JSON.stringify(goalInput)),
    );
    const goal = nutritionGoalSchema.parse(JSON.parse(response.body ?? ''));

    expect(response.statusCode).toBe(201);
    expect(goal).toMatchObject({ ...goalInput, userId: 'user-123' });
    expect(documentClientMock.commandCalls(PutCommand)[0]?.args[0].input)
      .toEqual({
        ConditionExpression:
          'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
        Item: {
          ...goal,
          entityKey: `NUTRITION_GOAL#${goal.effectiveFrom}`,
        },
        TableName: 'UserDataTable',
      });
  });

  it('rejects a second goal beginning on the same date', async () => {
    const duplicate = new Error('Condition failed');
    duplicate.name = 'ConditionalCheckFailedException';
    documentClientMock.on(PutCommand).rejects(duplicate);

    const response = await handler(
      createEvent('POST /nutrition-goals', JSON.stringify(goalInput)),
    );

    expect(response.statusCode).toBe(409);
  });

  it('gets the latest goal effective on a local date', async () => {
    documentClientMock.on(QueryCommand).resolves({
      Items: [
        {
          ...storedGoal,
          entityKey: `NUTRITION_GOAL#${storedGoal.effectiveFrom}`,
        },
      ],
    });

    const response = await handler(
      createEvent('GET /nutrition-goals/effective', undefined, '2026-10-31'),
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body ?? '')).toEqual({ goal: storedGoal });
    expect(documentClientMock.commandCalls(QueryCommand)[0]?.args[0].input)
      .toEqual({
        ExpressionAttributeValues: {
          ':firstGoal': 'NUTRITION_GOAL#',
          ':lastGoal': 'NUTRITION_GOAL#2026-10-31',
          ':userId': 'user-123',
        },
        KeyConditionExpression:
          'userId = :userId AND entityKey BETWEEN :firstGoal AND :lastGoal',
        Limit: 1,
        ScanIndexForward: false,
        TableName: 'UserDataTable',
      });
  });

  it('rejects an invalid effective lookup date', async () => {
    const response = await handler(
      createEvent('GET /nutrition-goals/effective', undefined, '10/31/2026'),
    );

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(QueryCommand)).toHaveLength(0);
  });

  it('returns not found when no goal applies', async () => {
    const response = await handler(
      createEvent('GET /nutrition-goals/effective', undefined, '2026-10-31'),
    );

    expect(response.statusCode).toBe(404);
  });
});
