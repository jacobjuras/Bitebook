import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { handler } from '../index.js';
import {
  documentClientMock,
  resetDocumentClientMock,
  storedFood,
  storedTag,
  validFoodInput,
} from './fixtures.js';

function createEvent(
  routeKey: string,
  body = '',
  subject: string | undefined = 'user-123',
): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    body,
    routeKey,
    requestContext: {
      authorizer: { jwt: { claims: subject ? { sub: subject } : {} } },
    },
  } as APIGatewayProxyEventV2WithJWTAuthorizer;
}

function cancelledAt(index: number, count: number): TransactionCanceledException {
  return new TransactionCanceledException({
    $metadata: {},
    CancellationReasons: Array.from({ length: count }, (_, reasonIndex) => ({
      Code: reasonIndex === index ? 'ConditionalCheckFailed' : 'None',
    })),
    message: 'cancelled',
  });
}

describe('handler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T07:00:00.000Z'));
    resetDocumentClientMock();
    process.env.USER_DATA_TABLE_NAME = 'UserDataTable';
  });

  afterAll(() => {
    vi.useRealTimers();
    delete process.env.USER_DATA_TABLE_NAME;
  });

  it('rejects requests without an authenticated subject', async () => {
    const response = await handler(createEvent('GET /foods', '', ''));

    expect(response).toEqual({
      body: JSON.stringify({ message: 'Authentication required' }),
      headers: { 'content-type': 'application/json' },
      statusCode: 401,
    });
    expect(documentClientMock.calls()).toHaveLength(0);
  });

  it('fails when the data table is not configured', async () => {
    delete process.env.USER_DATA_TABLE_NAME;

    await expect(handler(createEvent('GET /foods'))).rejects.toThrow(
      'USER_DATA_TABLE_NAME is not configured',
    );
  });

  it('lists durable Tags for the authenticated user', async () => {
    documentClientMock.on(QueryCommand).resolves({
      Items: [{ ...storedTag, entityKey: `TAG#${storedTag.id}` }],
    });

    const response = await handler(createEvent('GET /tags'));

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body ?? '')).toEqual({ tags: [storedTag] });
  });

  it('routes Food creation through the authenticated handler', async () => {
    const response = await handler(createEvent(
      'POST /foods',
      JSON.stringify(validFoodInput),
    ));

    expect(response.statusCode).toBe(201);
    expect(documentClientMock.commandCalls(TransactWriteCommand)).toHaveLength(1);
  });

  it('updates mutable Food metadata with owned Tag references', async () => {
    const updatedFood = {
      ...storedFood,
      isFavorite: true,
      name: 'Rolled oats',
      updatedAt: '2026-10-19T07:00:00.000Z',
    };
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedFood, entityKey: `FOOD#${storedFood.id}` },
    });
    const event = createEvent(
      'PATCH /foods/{foodId}',
      JSON.stringify({
        isFavorite: true,
        name: 'Rolled oats',
        tagIds: storedFood.tagIds,
      }),
    );
    event.pathParameters = { foodId: storedFood.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body ?? '')).toEqual({ food: updatedFood });
    expect(documentClientMock.commandCalls(TransactWriteCommand)[0]?.args[0].input)
      .toEqual({
        TransactItems: [
          {
            ConditionCheck: {
              ConditionExpression:
                'attribute_exists(userId) AND attribute_exists(entityKey)',
              Key: {
                entityKey: `TAG#${storedFood.tagIds[0]}`,
                userId: 'user-123',
              },
              TableName: 'UserDataTable',
            },
          },
          {
            Put: {
              ConditionExpression: 'updatedAt = :expectedUpdatedAt',
              ExpressionAttributeValues: {
                ':expectedUpdatedAt': storedFood.updatedAt,
              },
              Item: {
                ...updatedFood,
                entityKey: `FOOD#${storedFood.id}`,
              },
              TableName: 'UserDataTable',
            },
          },
        ],
      });
  });

  it.each([
    ['invalid Food ID', 'not-a-uuid', JSON.stringify({ name: 'New name' })],
    ['malformed body', storedFood.id, '{'],
    ['obsolete stock field', storedFood.id, JSON.stringify({ currentStock: { amount: 1, unit: 'g' } })],
    ['server-managed recency', storedFood.id, JSON.stringify({
      lastLoggedAt: '2026-10-20T01:00:00.000Z',
    })],
  ])('rejects a Food update with %s', async (_case, foodId, body) => {
    const event = createEvent('PATCH /foods/{foodId}', body);
    event.pathParameters = { foodId };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(GetCommand)).toHaveLength(0);
  });

  it('returns not found when updating an absent Food', async () => {
    const event = createEvent(
      'PATCH /foods/{foodId}',
      JSON.stringify({ name: 'New name' }),
    );
    event.pathParameters = { foodId: storedFood.id };

    await expect(handler(event)).resolves.toMatchObject({ statusCode: 404 });
    expect(documentClientMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
  });

  it('rejects unavailable Tags during a Food update', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedFood, entityKey: `FOOD#${storedFood.id}` },
    });
    documentClientMock.on(TransactWriteCommand).rejects(cancelledAt(0, 2));
    const event = createEvent(
      'PATCH /foods/{foodId}',
      JSON.stringify({ tagIds: storedFood.tagIds }),
    );
    event.pathParameters = { foodId: storedFood.id };

    await expect(handler(event)).resolves.toMatchObject({ statusCode: 400 });
  });

  it('rejects a stale Food update', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedFood, entityKey: `FOOD#${storedFood.id}` },
    });
    documentClientMock.on(TransactWriteCommand).rejects(cancelledAt(0, 1));
    const event = createEvent(
      'PATCH /foods/{foodId}',
      JSON.stringify({ name: 'New name' }),
    );
    event.pathParameters = { foodId: storedFood.id };

    await expect(handler(event)).resolves.toMatchObject({ statusCode: 409 });
  });

  it('deletes an existing Food', async () => {
    const event = createEvent('DELETE /foods/{foodId}');
    event.pathParameters = { foodId: storedFood.id };

    await expect(handler(event)).resolves.toEqual({ statusCode: 204 });
    expect(documentClientMock.commandCalls(DeleteCommand)[0]?.args[0].input)
      .toMatchObject({
        Key: { entityKey: `FOOD#${storedFood.id}`, userId: 'user-123' },
        TableName: 'UserDataTable',
      });
  });

  it('returns not found when deleting an absent Food', async () => {
    const missing = new Error('missing');
    missing.name = 'ConditionalCheckFailedException';
    documentClientMock.on(DeleteCommand).rejects(missing);
    const event = createEvent('DELETE /foods/{foodId}');
    event.pathParameters = { foodId: storedFood.id };

    await expect(handler(event)).resolves.toMatchObject({ statusCode: 404 });
  });

  it('rejects an invalid Food ID before deleting', async () => {
    const event = createEvent('DELETE /foods/{foodId}');
    event.pathParameters = { foodId: 'invalid' };

    await expect(handler(event)).resolves.toMatchObject({ statusCode: 400 });
    expect(documentClientMock.commandCalls(DeleteCommand)).toHaveLength(0);
  });

  it('returns not found for unsupported routes', async () => {
    const response = await handler(createEvent('DELETE /foods'));

    expect(response.statusCode).toBe(404);
    expect(documentClientMock.calls()).toHaveLength(0);
  });
});
