import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { nutritionGoalSchema } from '@bitebook/domain';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

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
  effectiveFrom?: string,
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    body,
    pathParameters: effectiveFrom ? { effectiveFrom } : undefined,
    queryStringParameters: date ? { date } : undefined,
    routeKey,
    requestContext: {
      authorizer: { jwt: { claims: { sub: 'user-123' } } },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

describe('NutritionGoal routes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T18:00:00.000Z'));
    documentClientMock.reset();
    documentClientMock.on(GetCommand).resolves({
      Item: { entityKey: 'PROFILE', timeZone: 'America/Los_Angeles' },
    });
    documentClientMock.on(PutCommand).resolves({});
    documentClientMock.on(QueryCommand).resolves({ Items: [] });
    process.env.USER_DATA_TABLE_NAME = 'UserDataTable';
  });

  afterAll(() => {
    vi.useRealTimers();
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

  it('rejects an invalid NutritionGoal effective date', async () => {
    const response = await handler(createEvent(
      'PUT /nutrition-goals/{effectiveFrom}',
      JSON.stringify({ caloriesKcal: 2_400, effectiveFrom: '2026-11-01' }),
      undefined,
      'not-a-date',
    ));

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(GetCommand)).toHaveLength(0);
  });

  it('deletes a NutritionGoal by effective date', async () => {
    documentClientMock.on(DeleteCommand).resolves({});

    const response = await handler(createEvent(
      'DELETE /nutrition-goals/{effectiveFrom}',
      undefined,
      undefined,
      '2026-10-19',
    ));

    expect(response).toEqual({ statusCode: 204 });
    expect(documentClientMock.commandCalls(DeleteCommand)[0]?.args[0].input)
      .toEqual({
        ConditionExpression:
          'attribute_exists(userId) AND attribute_exists(entityKey)',
        Key: {
          entityKey: 'NUTRITION_GOAL#2026-10-19',
          userId: 'user-123',
        },
        TableName: 'UserDataTable',
      });
  });

  it('rejects an invalid NutritionGoal deletion date', async () => {
    const response = await handler(createEvent(
      'DELETE /nutrition-goals/{effectiveFrom}',
      undefined,
      undefined,
      'not-a-date',
    ));

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(DeleteCommand)).toHaveLength(0);
  });

  it('returns not found when deleting a missing NutritionGoal', async () => {
    const missing = new Error('Condition failed');
    missing.name = 'ConditionalCheckFailedException';
    documentClientMock.on(DeleteCommand).rejects(missing);

    const response = await handler(createEvent(
      'DELETE /nutrition-goals/{effectiveFrom}',
      undefined,
      undefined,
      '2026-10-19',
    ));

    expect(response.statusCode).toBe(404);
  });

  it('replaces a goal on the same future date', async () => {
    const input = {
      caloriesKcal: 2_400,
      effectiveFrom: '2026-10-25',
    };

    const response = await handler(createEvent(
      'PUT /nutrition-goals/{effectiveFrom}',
      JSON.stringify(input),
      undefined,
      '2026-10-25',
    ));
    const goal = nutritionGoalSchema.parse(JSON.parse(response.body ?? ''));

    expect(response.statusCode).toBe(200);
    expect(goal).toMatchObject({
      caloriesKcal: 2_400,
      effectiveFrom: '2026-10-25',
      userId: 'user-123',
    });
    expect(documentClientMock.commandCalls(PutCommand)[0]?.args[0].input)
      .toEqual({
        ConditionExpression:
          'attribute_exists(userId) AND attribute_exists(entityKey)',
        Item: { ...goal, entityKey: 'NUTRITION_GOAL#2026-10-25' },
        TableName: 'UserDataTable',
      });
  });

  it('reschedules a goal to another future date atomically', async () => {
    const response = await handler(createEvent(
      'PUT /nutrition-goals/{effectiveFrom}',
      JSON.stringify({
        caloriesKcal: 2_400,
        effectiveFrom: '2026-11-01',
      }),
      undefined,
      '2026-10-25',
    ));
    const goal = nutritionGoalSchema.parse(JSON.parse(response.body ?? ''));

    expect(response.statusCode).toBe(200);
    expect(documentClientMock.commandCalls(TransactWriteCommand)[0]?.args[0].input)
      .toEqual({
        TransactItems: [
          {
            Delete: {
              ConditionExpression:
                'attribute_exists(userId) AND attribute_exists(entityKey)',
              Key: {
                entityKey: 'NUTRITION_GOAL#2026-10-25',
                userId: 'user-123',
              },
              TableName: 'UserDataTable',
            },
          },
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: { ...goal, entityKey: 'NUTRITION_GOAL#2026-11-01' },
              TableName: 'UserDataTable',
            },
          },
        ],
      });
  });

  it.each([
    { effectiveFrom: '2026-10-25', previousEffectiveFrom: '2026-10-19' },
    { effectiveFrom: '2026-10-19', previousEffectiveFrom: '2026-10-25' },
  ])('does not rewrite effective history', async ({
    effectiveFrom,
    previousEffectiveFrom,
  }) => {
    const response = await handler(createEvent(
      'PUT /nutrition-goals/{effectiveFrom}',
      JSON.stringify({ caloriesKcal: 2_400, effectiveFrom }),
      undefined,
      previousEffectiveFrom,
    ));

    expect(response.statusCode).toBe(409);
    expect(documentClientMock.commandCalls(PutCommand)).toHaveLength(0);
    expect(documentClientMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
  });

  it('requires a profile to determine the current local date', async () => {
    documentClientMock.on(GetCommand).resolves({});

    const response = await handler(createEvent(
      'PUT /nutrition-goals/{effectiveFrom}',
      JSON.stringify({
        caloriesKcal: 2_400,
        effectiveFrom: '2026-11-01',
      }),
      undefined,
      '2026-10-25',
    ));

    expect(response.statusCode).toBe(409);
    expect(documentClientMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
  });

  it('rejects a conflicting destination date', async () => {
    documentClientMock.on(TransactWriteCommand).rejects(
      new TransactionCanceledException({
        $metadata: {},
        CancellationReasons: [
          { Code: 'None' },
          { Code: 'ConditionalCheckFailed' },
        ],
        message: 'Transaction cancelled',
      }),
    );

    const response = await handler(createEvent(
      'PUT /nutrition-goals/{effectiveFrom}',
      JSON.stringify({
        caloriesKcal: 2_400,
        effectiveFrom: '2026-11-01',
      }),
      undefined,
      '2026-10-25',
    ));

    expect(response.statusCode).toBe(409);
  });
});
