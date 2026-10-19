import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  foodSchema,
  mealSchema,
  stockTransactionSchema,
} from '@bitebook/domain';
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

const stockAdjustmentInput = {
  direction: 'increase',
  idempotencyKey: 'f04fa2f1-702f-4518-b7f8-b3e588961738',
  quantity: { amount: 0.5, unit: 'kg' },
  reason: 'restock',
};

const createMealInput = {
  ingredients: [
    { foodId: storedFood.id, quantity: { amount: 80, unit: 'g' } },
    {
      foodId: 'e240e5a3-e4cd-4df0-9d6e-0c5d1856f780',
      quantity: { amount: 1, unit: 'item' },
    },
  ],
  name: 'Breakfast',
};

const storedMeal = {
  ...createMealInput,
  createdAt: '2026-10-19T05:00:00.000Z',
  id: '1d78fb29-f8ce-47a3-9ab4-38e0dc705832',
  updatedAt: '2026-10-19T05:00:00.000Z',
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
    documentClientMock.on(DeleteCommand).resolves({});
    documentClientMock.on(GetCommand).resolves({});
    documentClientMock.on(PutCommand).resolves({});
    documentClientMock.on(QueryCommand).resolves({ Items: [] });
    documentClientMock.on(TransactWriteCommand).resolves({});
    documentClientMock.on(UpdateCommand).resolves({});
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

  it('gets one Food owned by the authenticated user', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedFood, entityKey: `FOOD#${storedFood.id}` },
    });
    const event = createEvent('', 'user-123', 'GET /foods/{foodId}');
    event.pathParameters = { foodId: storedFood.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body ?? '')).toEqual({ food: storedFood });
    expect(documentClientMock.commandCalls(GetCommand)[0]?.args[0].input)
      .toEqual({
        Key: {
          entityKey: `FOOD#${storedFood.id}`,
          userId: 'user-123',
        },
        TableName: 'UserDataTable',
      });
  });

  it('returns not found when a Food does not exist', async () => {
    const event = createEvent('', 'user-123', 'GET /foods/{foodId}');
    event.pathParameters = { foodId: storedFood.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
  });

  it('rejects an invalid Food ID', async () => {
    const event = createEvent('', 'user-123', 'GET /foods/{foodId}');
    event.pathParameters = { foodId: 'not-a-uuid' };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(GetCommand)).toHaveLength(0);
  });

  it('updates mutable fields on an authenticated user\'s Food', async () => {
    const updatedFood = {
      ...storedFood,
      name: 'Rolled oats',
      updatedAt: '2026-10-19T04:00:00.000Z',
    };
    documentClientMock.on(UpdateCommand).resolves({
      Attributes: {
        ...updatedFood,
        entityKey: `FOOD#${storedFood.id}`,
      },
    });
    const event = createEvent(
      JSON.stringify({ name: 'Rolled oats' }),
      'user-123',
      'PATCH /foods/{foodId}',
    );
    event.pathParameters = { foodId: storedFood.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body ?? '')).toEqual({ food: updatedFood });
    expect(documentClientMock.commandCalls(UpdateCommand)[0]?.args[0].input)
      .toEqual({
        ConditionExpression:
          'attribute_exists(userId) AND attribute_exists(entityKey)',
        ExpressionAttributeNames: {
          '#field0': 'name',
          '#field1': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':value0': 'Rolled oats',
          ':value1': expect.any(String),
        },
        Key: {
          entityKey: `FOOD#${storedFood.id}`,
          userId: 'user-123',
        },
        ReturnValues: 'ALL_NEW',
        TableName: 'UserDataTable',
        UpdateExpression: 'SET #field0 = :value0, #field1 = :value1',
      });
  });

  it.each([
    ['without mutable fields', '{}'],
    ['with ownership fields', JSON.stringify({ userId: 'attacker' })],
    ['with stock changes', JSON.stringify({ currentStock: validInput.currentStock })],
    ['with invalid values', JSON.stringify({ name: '' })],
  ])('rejects an update %s', async (_case, body) => {
    const event = createEvent(body, 'user-123', 'PATCH /foods/{foodId}');
    event.pathParameters = { foodId: storedFood.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('returns not found when updating a missing Food', async () => {
    const missingError = new Error('Condition failed');
    missingError.name = 'ConditionalCheckFailedException';
    documentClientMock.on(UpdateCommand).rejects(missingError);
    const event = createEvent(
      JSON.stringify({ name: 'Rolled oats' }),
      'user-123',
      'PATCH /foods/{foodId}',
    );
    event.pathParameters = { foodId: storedFood.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
  });

  it('updates stock and records one immutable transaction', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedFood, entityKey: `FOOD#${storedFood.id}` },
    });
    const event = createEvent(
      JSON.stringify(stockAdjustmentInput),
      'user-123',
      'POST /foods/{foodId}/stock-adjustments',
    );
    event.pathParameters = { foodId: storedFood.id };

    const response = await handler(event);
    const body = JSON.parse(response.body ?? '');
    const food = foodSchema.parse(body.food);
    const stockTransaction = stockTransactionSchema.parse(body.stockTransaction);

    expect(response.statusCode).toBe(200);
    expect(food.currentStock).toEqual({ amount: 1_000, unit: 'g' });
    expect(documentClientMock.commandCalls(GetCommand)[0]?.args[0].input)
      .toEqual({
        ConsistentRead: true,
        Key: {
          entityKey: `FOOD#${storedFood.id}`,
          userId: 'user-123',
        },
        TableName: 'UserDataTable',
      });
    expect(stockTransaction).toMatchObject({
      direction: stockAdjustmentInput.direction,
      foodId: storedFood.id,
      id: stockAdjustmentInput.idempotencyKey,
      quantity: stockAdjustmentInput.quantity,
      reason: stockAdjustmentInput.reason,
      userId: 'user-123',
    });
    expect(documentClientMock.commandCalls(TransactWriteCommand)[0]?.args[0].input)
      .toEqual({
        TransactItems: [
          {
            Update: {
              ConditionExpression: 'currentStock = :expectedStock',
              ExpressionAttributeValues: {
                ':expectedStock': storedFood.currentStock,
                ':newStock': { amount: 1_000, unit: 'g' },
                ':updatedAt': stockTransaction.createdAt,
              },
              Key: {
                entityKey: `FOOD#${storedFood.id}`,
                userId: 'user-123',
              },
              TableName: 'UserDataTable',
              UpdateExpression:
                'SET currentStock = :newStock, updatedAt = :updatedAt',
            },
          },
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: {
                ...stockTransaction,
                entityKey: `STOCK_TRANSACTION#${stockTransaction.id}`,
              },
              TableName: 'UserDataTable',
            },
          },
        ],
      });
  });

  it('rejects a stock change that would produce negative stock', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedFood, entityKey: `FOOD#${storedFood.id}` },
    });
    const event = createEvent(
      JSON.stringify({
        ...stockAdjustmentInput,
        direction: 'decrease',
        quantity: { amount: 600, unit: 'g' },
      }),
      'user-123',
      'POST /foods/{foodId}/stock-adjustments',
    );
    event.pathParameters = { foodId: storedFood.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
  });

  it('rejects a concurrent or duplicate stock change', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedFood, entityKey: `FOOD#${storedFood.id}` },
    });
    const conflict = new TransactionCanceledException({
      $metadata: {},
      CancellationReasons: [{ Code: 'ConditionalCheckFailed' }],
      message: 'Transaction cancelled',
    });
    documentClientMock.on(TransactWriteCommand).rejects(conflict);
    const event = createEvent(
      JSON.stringify(stockAdjustmentInput),
      'user-123',
      'POST /foods/{foodId}/stock-adjustments',
    );
    event.pathParameters = { foodId: storedFood.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(409);
  });

  it('propagates retryable stock transaction failures', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedFood, entityKey: `FOOD#${storedFood.id}` },
    });
    const throttled = new TransactionCanceledException({
      $metadata: {},
      CancellationReasons: [{ Code: 'ThrottlingError' }],
      message: 'Transaction throttled',
    });
    documentClientMock.on(TransactWriteCommand).rejects(throttled);
    const event = createEvent(
      JSON.stringify(stockAdjustmentInput),
      'user-123',
      'POST /foods/{foodId}/stock-adjustments',
    );
    event.pathParameters = { foodId: storedFood.id };

    await expect(handler(event)).rejects.toBe(throttled);
  });

  it('deletes a Food owned by the authenticated user', async () => {
    const event = createEvent('', 'user-123', 'DELETE /foods/{foodId}');
    event.pathParameters = { foodId: storedFood.id };

    const response = await handler(event);

    expect(response).toEqual({ statusCode: 204 });
    expect(documentClientMock.commandCalls(DeleteCommand)[0]?.args[0].input)
      .toEqual({
        ConditionExpression:
          'attribute_exists(userId) AND attribute_exists(entityKey)',
        Key: {
          entityKey: `FOOD#${storedFood.id}`,
          userId: 'user-123',
        },
        TableName: 'UserDataTable',
      });
  });

  it('rejects an invalid Food ID for deletion', async () => {
    const event = createEvent('', 'user-123', 'DELETE /foods/{foodId}');
    event.pathParameters = { foodId: 'not-a-uuid' };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(DeleteCommand)).toHaveLength(0);
  });

  it('returns not found when deleting a missing Food', async () => {
    const missingError = new Error('Condition failed');
    missingError.name = 'ConditionalCheckFailedException';
    documentClientMock.on(DeleteCommand).rejects(missingError);
    const event = createEvent('', 'user-123', 'DELETE /foods/{foodId}');
    event.pathParameters = { foodId: storedFood.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
  });

  it('creates a Meal from Foods owned by the authenticated user', async () => {
    const response = await handler(
      createEvent(JSON.stringify(createMealInput), 'user-123', 'POST /meals'),
    );
    const meal = mealSchema.parse(JSON.parse(response.body ?? ''));

    expect(response.statusCode).toBe(201);
    expect(meal).toMatchObject({ ...createMealInput, userId: 'user-123' });
    expect(meal.createdAt).toBe(meal.updatedAt);
    expect(documentClientMock.commandCalls(TransactWriteCommand)[0]?.args[0].input)
      .toEqual({
        TransactItems: [
          ...createMealInput.ingredients.map(({ foodId }) => ({
            ConditionCheck: {
              ConditionExpression:
                'attribute_exists(userId) AND attribute_exists(entityKey)',
              Key: { entityKey: `FOOD#${foodId}`, userId: 'user-123' },
              TableName: 'UserDataTable',
            },
          })),
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: { ...meal, entityKey: `MEAL#${meal.id}` },
              TableName: 'UserDataTable',
            },
          },
        ],
      });
  });

  it('rejects invalid Meal input before writing', async () => {
    const response = await handler(
      createEvent(JSON.stringify({ name: 'Breakfast', ingredients: [] }), 'user-123', 'POST /meals'),
    );

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
  });

  it('rejects a Meal containing a Food the user does not own', async () => {
    const missingFood = new TransactionCanceledException({
      $metadata: {},
      CancellationReasons: [{ Code: 'ConditionalCheckFailed' }, { Code: 'None' }],
      message: 'Transaction cancelled',
    });
    documentClientMock.on(TransactWriteCommand).rejects(missingFood);

    const response = await handler(
      createEvent(JSON.stringify(createMealInput), 'user-123', 'POST /meals'),
    );

    expect(response.statusCode).toBe(400);
  });

  it('lists Meals owned by the authenticated user', async () => {
    documentClientMock.on(QueryCommand).resolves({
      Items: [{ ...storedMeal, entityKey: `MEAL#${storedMeal.id}` }],
    });

    const response = await handler(createEvent('', 'user-123', 'GET /meals'));

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body ?? '')).toEqual({ meals: [storedMeal] });
    expect(documentClientMock.commandCalls(QueryCommand)[0]?.args[0].input)
      .toEqual({
        ExpressionAttributeValues: {
          ':entityPrefix': 'MEAL#',
          ':userId': 'user-123',
        },
        KeyConditionExpression:
          'userId = :userId AND begins_with(entityKey, :entityPrefix)',
        TableName: 'UserDataTable',
      });
  });

  it('gets one Meal owned by the authenticated user', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedMeal, entityKey: `MEAL#${storedMeal.id}` },
    });
    const event = createEvent('', 'user-123', 'GET /meals/{mealId}');
    event.pathParameters = { mealId: storedMeal.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body ?? '')).toEqual({ meal: storedMeal });
    expect(documentClientMock.commandCalls(GetCommand)[0]?.args[0].input)
      .toEqual({
        Key: { entityKey: `MEAL#${storedMeal.id}`, userId: 'user-123' },
        TableName: 'UserDataTable',
      });
  });

  it('returns not found when a Meal does not exist', async () => {
    const event = createEvent('', 'user-123', 'GET /meals/{mealId}');
    event.pathParameters = { mealId: storedMeal.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
  });

  it('rejects an invalid Meal ID', async () => {
    const event = createEvent('', 'user-123', 'GET /meals/{mealId}');
    event.pathParameters = { mealId: 'not-a-uuid' };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(GetCommand)).toHaveLength(0);
  });

  it('updates Meal metadata with optimistic concurrency', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedMeal, entityKey: `MEAL#${storedMeal.id}` },
    });
    const event = createEvent(
      JSON.stringify({ name: 'Weekend breakfast' }),
      'user-123',
      'PATCH /meals/{mealId}',
    );
    event.pathParameters = { mealId: storedMeal.id };

    const response = await handler(event);
    const updatedMeal = mealSchema.parse(JSON.parse(response.body ?? ''));

    expect(response.statusCode).toBe(200);
    expect(updatedMeal).toMatchObject({
      ...storedMeal,
      name: 'Weekend breakfast',
      updatedAt: expect.any(String),
    });
    expect(updatedMeal.updatedAt).not.toBe(storedMeal.updatedAt);
    expect(documentClientMock.commandCalls(GetCommand)[0]?.args[0].input)
      .toEqual({
        ConsistentRead: true,
        Key: { entityKey: `MEAL#${storedMeal.id}`, userId: 'user-123' },
        TableName: 'UserDataTable',
      });
    expect(documentClientMock.commandCalls(TransactWriteCommand)[0]?.args[0].input)
      .toEqual({
        TransactItems: [
          {
            Put: {
              ConditionExpression: 'updatedAt = :expectedUpdatedAt',
              ExpressionAttributeValues: {
                ':expectedUpdatedAt': storedMeal.updatedAt,
              },
              Item: {
                ...updatedMeal,
                entityKey: `MEAL#${storedMeal.id}`,
              },
              TableName: 'UserDataTable',
            },
          },
        ],
      });
  });

  it('rejects unavailable Foods in updated Meal ingredients', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedMeal, entityKey: `MEAL#${storedMeal.id}` },
    });
    const unavailableFood = new TransactionCanceledException({
      $metadata: {},
      CancellationReasons: [{ Code: 'ConditionalCheckFailed' }, { Code: 'None' }],
      message: 'Transaction cancelled',
    });
    documentClientMock.on(TransactWriteCommand).rejects(unavailableFood);
    const event = createEvent(
      JSON.stringify({ ingredients: createMealInput.ingredients }),
      'user-123',
      'PATCH /meals/{mealId}',
    );
    event.pathParameters = { mealId: storedMeal.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
  });

  it('rejects a stale Meal update', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedMeal, entityKey: `MEAL#${storedMeal.id}` },
    });
    const conflict = new TransactionCanceledException({
      $metadata: {},
      CancellationReasons: [{ Code: 'ConditionalCheckFailed' }],
      message: 'Transaction cancelled',
    });
    documentClientMock.on(TransactWriteCommand).rejects(conflict);
    const event = createEvent(
      JSON.stringify({ name: 'Weekend breakfast' }),
      'user-123',
      'PATCH /meals/{mealId}',
    );
    event.pathParameters = { mealId: storedMeal.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(409);
  });

  it('deletes a Meal owned by the authenticated user', async () => {
    const event = createEvent('', 'user-123', 'DELETE /meals/{mealId}');
    event.pathParameters = { mealId: storedMeal.id };

    const response = await handler(event);

    expect(response).toEqual({ statusCode: 204 });
    expect(documentClientMock.commandCalls(DeleteCommand)[0]?.args[0].input)
      .toEqual({
        ConditionExpression:
          'attribute_exists(userId) AND attribute_exists(entityKey)',
        Key: {
          entityKey: `MEAL#${storedMeal.id}`,
          userId: 'user-123',
        },
        TableName: 'UserDataTable',
      });
  });

  it('rejects an invalid Meal ID for deletion', async () => {
    const event = createEvent('', 'user-123', 'DELETE /meals/{mealId}');
    event.pathParameters = { mealId: 'not-a-uuid' };

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(DeleteCommand)).toHaveLength(0);
  });

  it('returns not found when deleting a missing Meal', async () => {
    const missingError = new Error('Condition failed');
    missingError.name = 'ConditionalCheckFailedException';
    documentClientMock.on(DeleteCommand).rejects(missingError);
    const event = createEvent('', 'user-123', 'DELETE /meals/{mealId}');
    event.pathParameters = { mealId: storedMeal.id };

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
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
