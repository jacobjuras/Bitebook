import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adjustFoodStock } from '../stockAdjustments.js';
import {
  documentClientMock,
  resetDocumentClientMock,
  storedFood,
} from './fixtures.js';

const adjustment = {
  direction: 'increase',
  idempotencyKey: 'f04fa2f1-702f-4518-b7f8-b3e588961738',
  quantity: { amount: 0.5, unit: 'kg' },
  reason: 'restock',
};

describe('adjustFoodStock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T07:00:00.000Z'));
    resetDocumentClientMock();
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedFood, entityKey: `FOOD#${storedFood.id}` },
    });
  });

  it('atomically updates stock and records an immutable transaction', async () => {
    const response = await adjustFoodStock(
      'table',
      'user-123',
      storedFood.id,
      JSON.stringify(adjustment),
    );
    const body = JSON.parse(response.body ?? '');

    expect(response.statusCode).toBe(200);
    expect(body.food.currentStock).toEqual({ amount: 1_000, unit: 'g' });
    expect(body.stockTransaction).toMatchObject({
      foodId: storedFood.id,
      id: adjustment.idempotencyKey,
      userId: 'user-123',
    });
    expect(documentClientMock.commandCalls(GetCommand)[0]?.args[0].input)
      .toMatchObject({ ConsistentRead: true });
    expect(documentClientMock.commandCalls(TransactWriteCommand)[0]?.args[0].input)
      .toMatchObject({
        TransactItems: [
          {
            Update: {
              ConditionExpression: 'currentStock = :expectedStock',
              Key: { entityKey: `FOOD#${storedFood.id}`, userId: 'user-123' },
              TableName: 'table',
            },
          },
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              TableName: 'table',
            },
          },
        ],
      });
  });

  it.each([
    ['an invalid Food ID', 'not-a-uuid', JSON.stringify(adjustment)],
    ['malformed JSON', storedFood.id, '{'],
    ['invalid input', storedFood.id, '{}'],
  ])('rejects %s before reading the Food', async (_case, foodId, body) => {
    const response = await adjustFoodStock('table', 'user-123', foodId, body);

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(GetCommand)).toHaveLength(0);
  });

  it('returns not found when the Food is absent', async () => {
    documentClientMock.on(GetCommand).resolves({});

    const response = await adjustFoodStock(
      'table',
      'user-123',
      storedFood.id,
      JSON.stringify(adjustment),
    );

    expect(response.statusCode).toBe(404);
  });

  it('rejects a decrease that would make stock negative', async () => {
    const response = await adjustFoodStock(
      'table',
      'user-123',
      storedFood.id,
      JSON.stringify({
        ...adjustment,
        direction: 'decrease',
        quantity: { amount: 600, unit: 'g' },
      }),
    );

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
  });

  it('reports concurrent and duplicate transaction conflicts', async () => {
    documentClientMock.on(TransactWriteCommand).rejects(
      new TransactionCanceledException({
        $metadata: {},
        CancellationReasons: [{ Code: 'ConditionalCheckFailed' }],
        message: 'cancelled',
      }),
    );

    const response = await adjustFoodStock(
      'table',
      'user-123',
      storedFood.id,
      JSON.stringify(adjustment),
    );

    expect(response.statusCode).toBe(409);
  });

  it('propagates retryable transaction failures', async () => {
    const throttled = new TransactionCanceledException({
      $metadata: {},
      CancellationReasons: [{ Code: 'ThrottlingError' }],
      message: 'throttled',
    });
    documentClientMock.on(TransactWriteCommand).rejects(throttled);

    await expect(adjustFoodStock(
      'table',
      'user-123',
      storedFood.id,
      JSON.stringify(adjustment),
    )).rejects.toBe(throttled);
  });
});
