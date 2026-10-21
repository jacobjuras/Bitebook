import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMeal, deleteMeal, updateMeal } from '../mealWrites.js';
import {
  documentClientMock,
  mealInput,
  resetDocumentClientMock,
  storedMeal,
} from './fixtures.js';

function cancelledAt(index: number, count: number): TransactionCanceledException {
  return new TransactionCanceledException({
    $metadata: {},
    CancellationReasons: Array.from({ length: count }, (_, reasonIndex) => ({
      Code: reasonIndex === index ? 'ConditionalCheckFailed' : 'None',
    })),
    message: 'cancelled',
  });
}

describe('mealWrites', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T07:00:00.000Z'));
    resetDocumentClientMock();
  });

  it('creates a Meal after checking every referenced Food', async () => {
    const response = await createMeal(
      'table',
      'user-123',
      JSON.stringify(mealInput),
    );
    const meal = JSON.parse(response.body ?? '');

    expect(response.statusCode).toBe(201);
    expect(meal).toMatchObject({ ...mealInput, userId: 'user-123' });
    expect(documentClientMock.commandCalls(TransactWriteCommand)[0]?.args[0].input)
      .toEqual({
        TransactItems: [
          ...mealInput.ingredients.map(({ foodId }) => ({
            ConditionCheck: {
              ConditionExpression:
                'attribute_exists(userId) AND attribute_exists(entityKey)',
              Key: { entityKey: `FOOD#${foodId}`, userId: 'user-123' },
              TableName: 'table',
            },
          })),
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: { ...meal, entityKey: `MEAL#${meal.id}` },
              TableName: 'table',
            },
          },
        ],
      });
  });

  it.each([undefined, '{', JSON.stringify({ name: 'Breakfast', ingredients: [] })])(
    'rejects invalid create body %s',
    async (body) => {
      const response = await createMeal('table', 'user-123', body);

      expect(response.statusCode).toBe(400);
      expect(documentClientMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
    },
  );

  it('distinguishes an unavailable Food from a Meal ID collision', async () => {
    documentClientMock.on(TransactWriteCommand)
      .rejectsOnce(cancelledAt(0, 3))
      .rejectsOnce(cancelledAt(2, 3));

    await expect(createMeal('table', 'user-123', JSON.stringify(mealInput)))
      .resolves.toMatchObject({ statusCode: 400 });
    await expect(createMeal('table', 'user-123', JSON.stringify(mealInput)))
      .resolves.toMatchObject({ statusCode: 409 });
  });

  it('updates a Meal with optimistic concurrency', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedMeal, entityKey: `MEAL#${storedMeal.id}` },
    });

    const response = await updateMeal(
      'table',
      'user-123',
      storedMeal.id,
      JSON.stringify({ name: 'Weekend breakfast' }),
    );
    const meal = JSON.parse(response.body ?? '');

    expect(response.statusCode).toBe(200);
    expect(meal.name).toBe('Weekend breakfast');
    expect(documentClientMock.commandCalls(GetCommand)[0]?.args[0].input)
      .toMatchObject({ ConsistentRead: true });
    expect(documentClientMock.commandCalls(TransactWriteCommand)[0]?.args[0].input)
      .toEqual({
        TransactItems: [{
          Put: {
            ConditionExpression: 'updatedAt = :expectedUpdatedAt',
            ExpressionAttributeValues: {
              ':expectedUpdatedAt': storedMeal.updatedAt,
            },
            Item: { ...meal, entityKey: `MEAL#${storedMeal.id}` },
            TableName: 'table',
          },
        }],
      });
  });

  it.each([
    ['invalid ID', 'not-a-uuid', JSON.stringify({ name: 'New name' })],
    ['malformed body', storedMeal.id, '{'],
    ['empty update', storedMeal.id, '{}'],
  ])('rejects an update with %s', async (_case, mealId, body) => {
    const response = await updateMeal('table', 'user-123', mealId, body);

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(GetCommand)).toHaveLength(0);
  });

  it('returns not found when updating an absent Meal', async () => {
    await expect(updateMeal(
      'table',
      'user-123',
      storedMeal.id,
      JSON.stringify({ name: 'New name' }),
    )).resolves.toMatchObject({ statusCode: 404 });
  });

  it('distinguishes unavailable ingredients from a stale Meal', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedMeal, entityKey: `MEAL#${storedMeal.id}` },
    });
    documentClientMock.on(TransactWriteCommand)
      .rejectsOnce(cancelledAt(0, mealInput.ingredients.length + 1))
      .rejectsOnce(cancelledAt(
        mealInput.ingredients.length,
        mealInput.ingredients.length + 1,
      ));
    const body = JSON.stringify({ ingredients: mealInput.ingredients });

    await expect(updateMeal('table', 'user-123', storedMeal.id, body))
      .resolves.toMatchObject({ statusCode: 400 });
    await expect(updateMeal('table', 'user-123', storedMeal.id, body))
      .resolves.toMatchObject({ statusCode: 409 });
  });

  it('deletes an existing Meal', async () => {
    const response = await deleteMeal('table', 'user-123', storedMeal.id);

    expect(response).toEqual({ statusCode: 204 });
    expect(documentClientMock.commandCalls(DeleteCommand)[0]?.args[0].input)
      .toMatchObject({
        Key: { entityKey: `MEAL#${storedMeal.id}`, userId: 'user-123' },
        TableName: 'table',
      });
  });

  it('rejects an invalid Meal ID before deleting', async () => {
    await expect(deleteMeal('table', 'user-123', 'invalid'))
      .resolves.toMatchObject({ statusCode: 400 });
    expect(documentClientMock.commandCalls(DeleteCommand)).toHaveLength(0);
  });

  it('returns not found when deleting an absent Meal', async () => {
    const missing = new Error('missing');
    missing.name = 'ConditionalCheckFailedException';
    documentClientMock.on(DeleteCommand).rejects(missing);

    await expect(deleteMeal('table', 'user-123', storedMeal.id))
      .resolves.toMatchObject({ statusCode: 404 });
  });
});
