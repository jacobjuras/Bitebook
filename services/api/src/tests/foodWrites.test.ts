import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { foodSchema } from '@bitebook/domain';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFood } from '../foodWrites.js';
import {
  documentClientMock, resetDocumentClientMock, validFoodInput,
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

describe('Food writes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T07:00:00.000Z'));
    resetDocumentClientMock();
  });

  afterAll(() => vi.useRealTimers());

  it('creates existing Tags, new Tags, reservations, and Food in one transaction', async () => {
    const response = await createFood(
      'UserDataTable',
      'user-123',
      JSON.stringify({
        ...validFoodInput,
        newTags: [{ color: '#abcdef', name: ' Fiber ' }],
      }),
    );
    const food = foodSchema.parse(JSON.parse(response.body ?? ''));
    const newTagId = food.tagIds?.[1];

    expect(response.statusCode).toBe(201);
    expect(food).toMatchObject({
      ...validFoodInput,
      tagIds: [validFoodInput.tagIds[0], newTagId],
      userId: 'user-123',
    });
    expect(newTagId).toBeTypeOf('string');
    expect(documentClientMock.commandCalls(TransactWriteCommand)).toHaveLength(1);
    expect(documentClientMock.commandCalls(TransactWriteCommand)[0]?.args[0].input)
      .toEqual({
        TransactItems: [
          {
            ConditionCheck: {
              ConditionExpression:
                'attribute_exists(userId) AND attribute_exists(entityKey)',
              Key: {
                entityKey: `TAG#${validFoodInput.tagIds[0]}`,
                userId: 'user-123',
              },
              TableName: 'UserDataTable',
            },
          },
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: {
                color: '#ABCDEF',
                createdAt: '2026-10-19T07:00:00.000Z',
                entityKey: `TAG#${newTagId}`,
                id: newTagId,
                name: 'Fiber',
                normalizedName: 'fiber',
                updatedAt: '2026-10-19T07:00:00.000Z',
                userId: 'user-123',
              },
              TableName: 'UserDataTable',
            },
          },
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: {
                entityKey: 'TAG_NAME#fiber',
                tagId: newTagId,
                userId: 'user-123',
              },
              TableName: 'UserDataTable',
            },
          },
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: { ...food, entityKey: `FOOD#${food.id}` },
              TableName: 'UserDataTable',
            },
          },
        ],
      });
  });

  it.each([
    ['existing Tag ownership check', 0, 400, 'Food contains unavailable Tags'],
    ['new Tag record write', 1, 409, 'Food could not be created; try again'],
    ['new Tag name matching an existing Tag', 2, 409, 'A Tag with this name already exists'],
    ['Food record write', 3, 409, 'Food could not be created; try again'],
  ])(
    'fails the whole operation when the %s fails',
    async (_action, failedIndex, statusCode, message) => {
      documentClientMock
        .on(TransactWriteCommand)
        .rejects(cancelledAt(failedIndex, 4));

      const response = await createFood(
        'UserDataTable',
        'user-123',
        JSON.stringify({
          ...validFoodInput,
          newTags: [{ name: 'protein' }],
        }),
      );

      expect(response).toEqual({
        body: JSON.stringify({ message }),
        headers: { 'content-type': 'application/json' },
        statusCode,
      });
      expect(documentClientMock.commandCalls(TransactWriteCommand)).toHaveLength(1);
    },
  );

  it.each([
    undefined,
    '{',
    JSON.stringify({ ...validFoodInput, userId: 'attacker' }),
    JSON.stringify({ ...validFoodInput, name: '' }),
    JSON.stringify({
      ...validFoodInput,
      newTags: [{ name: 'fiber' }, { name: ' Fiber ' }],
    }),
  ])('rejects invalid Food creation body %s', async (body) => {
    const response = await createFood('UserDataTable', 'user-123', body);

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
  });
});
