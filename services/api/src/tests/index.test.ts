import {
  DeleteCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { foodSchema } from '@bitebook/domain';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { handler } from '../index.js';
import {
  documentClientMock,
  resetDocumentClientMock,
  storedFood,
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

  it('creates a Food owned by the authenticated user', async () => {
    const response = await handler(createEvent(
      'POST /foods',
      JSON.stringify(validFoodInput),
    ));
    const food = foodSchema.parse(JSON.parse(response.body ?? ''));

    expect(response.statusCode).toBe(201);
    expect(food).toMatchObject({ ...validFoodInput, userId: 'user-123' });
    expect(food.createdAt).toBe(food.updatedAt);
    expect(documentClientMock.commandCalls(PutCommand)[0]?.args[0].input)
      .toEqual({
        ConditionExpression:
          'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
        Item: { ...food, entityKey: `FOOD#${food.id}` },
        TableName: 'UserDataTable',
      });
  });

  it.each([
    ['malformed JSON', '{'],
    ['undeclared ownership fields', JSON.stringify({ ...validFoodInput, userId: 'attacker' })],
    ['invalid values', JSON.stringify({ ...validFoodInput, name: '' })],
  ])('rejects Food creation with %s', async (_case, body) => {
    const response = await handler(createEvent('POST /foods', body));

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(PutCommand)).toHaveLength(0);
  });

  it('updates mutable Food metadata', async () => {
    const updatedFood = { ...storedFood, name: 'Rolled oats' };
    documentClientMock.on(UpdateCommand).resolves({
      Attributes: { ...updatedFood, entityKey: `FOOD#${storedFood.id}` },
    });
    const event = createEvent(
      'PATCH /foods/{foodId}',
      JSON.stringify({ name: 'Rolled oats' }),
    );
    event.pathParameters = { foodId: storedFood.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body ?? '')).toEqual({ food: updatedFood });
    expect(documentClientMock.commandCalls(UpdateCommand)[0]?.args[0].input)
      .toMatchObject({
        Key: { entityKey: `FOOD#${storedFood.id}`, userId: 'user-123' },
        ReturnValues: 'ALL_NEW',
        TableName: 'UserDataTable',
      });
  });

  it.each([
    ['invalid Food ID', 'not-a-uuid', JSON.stringify({ name: 'New name' })],
    ['malformed body', storedFood.id, '{'],
    ['stock mutation', storedFood.id, JSON.stringify({ currentStock: { amount: 1, unit: 'g' } })],
  ])('rejects a Food update with %s', async (_case, foodId, body) => {
    const event = createEvent('PATCH /foods/{foodId}', body);
    event.pathParameters = { foodId };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('returns not found when updating an absent Food', async () => {
    const missing = new Error('missing');
    missing.name = 'ConditionalCheckFailedException';
    documentClientMock.on(UpdateCommand).rejects(missing);
    const event = createEvent(
      'PATCH /foods/{foodId}',
      JSON.stringify({ name: 'New name' }),
    );
    event.pathParameters = { foodId: storedFood.id };

    await expect(handler(event)).resolves.toMatchObject({ statusCode: 404 });
  });

  it('fails when DynamoDB omits the updated Food', async () => {
    const event = createEvent(
      'PATCH /foods/{foodId}',
      JSON.stringify({ name: 'New name' }),
    );
    event.pathParameters = { foodId: storedFood.id };

    await expect(handler(event)).rejects.toThrow(
      'DynamoDB did not return the updated Food',
    );
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
