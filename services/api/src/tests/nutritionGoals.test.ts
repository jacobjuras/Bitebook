import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createNutritionGoal,
  deleteNutritionGoal,
  getEffectiveNutritionGoal,
  replaceFutureNutritionGoal,
} from '../nutritionGoals.js';
import {
  documentClientMock,
  resetDocumentClientMock,
} from './fixtures.js';

const goalInput = { caloriesKcal: 2_200, effectiveFrom: '2026-10-19' };
const storedGoal = {
  ...goalInput,
  createdAt: '2026-10-19T18:00:00.000Z',
  id: 'd4d194e1-df1e-47ea-a57a-f42b0aa9dcd2',
  userId: 'user-123',
};
const replacement = { caloriesKcal: 2_400, effectiveFrom: '2026-11-01' };

describe('nutritionGoals', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T18:00:00.000Z'));
    resetDocumentClientMock();
    documentClientMock.on(GetCommand).resolves({
      Item: { entityKey: 'PROFILE', timeZone: 'America/Los_Angeles' },
    });
  });

  afterAll(() => vi.useRealTimers());

  it('creates one goal for an effective date', async () => {
    const response = await createNutritionGoal(
      'table',
      'user-123',
      JSON.stringify(goalInput),
    );
    const goal = JSON.parse(response.body ?? '');

    expect(response.statusCode).toBe(201);
    expect(goal).toMatchObject({ ...goalInput, userId: 'user-123' });
    expect(documentClientMock.commandCalls(PutCommand)[0]?.args[0].input)
      .toEqual({
        ConditionExpression:
          'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
        Item: { ...goal, entityKey: `NUTRITION_GOAL#${goal.effectiveFrom}` },
        TableName: 'table',
      });
  });

  it.each([undefined, '{', JSON.stringify({ caloriesKcal: -1 })])(
    'rejects invalid create body %s',
    async (body) => {
      await expect(createNutritionGoal('table', 'user-123', body))
        .resolves.toMatchObject({ statusCode: 400 });
      expect(documentClientMock.commandCalls(PutCommand)).toHaveLength(0);
    },
  );

  it('reports a duplicate effective date', async () => {
    const duplicate = new Error('duplicate');
    duplicate.name = 'ConditionalCheckFailedException';
    documentClientMock.on(PutCommand).rejects(duplicate);

    await expect(createNutritionGoal(
      'table',
      'user-123',
      JSON.stringify(goalInput),
    )).resolves.toMatchObject({ statusCode: 409 });
  });

  it('gets the latest goal effective on a local date', async () => {
    documentClientMock.on(QueryCommand).resolves({
      Items: [{
        ...storedGoal,
        entityKey: `NUTRITION_GOAL#${storedGoal.effectiveFrom}`,
      }],
    });

    const response = await getEffectiveNutritionGoal(
      'table',
      'user-123',
      '2026-10-31',
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body ?? '')).toEqual({ goal: storedGoal });
    expect(documentClientMock.commandCalls(QueryCommand)[0]?.args[0].input)
      .toMatchObject({ Limit: 1, ScanIndexForward: false, TableName: 'table' });
  });

  it('rejects an invalid lookup date without querying', async () => {
    await expect(getEffectiveNutritionGoal('table', 'user-123', '10/31/2026'))
      .resolves.toMatchObject({ statusCode: 400 });
    expect(documentClientMock.commandCalls(QueryCommand)).toHaveLength(0);
  });

  it('returns not found when no goal applies', async () => {
    await expect(getEffectiveNutritionGoal('table', 'user-123', '2026-10-31'))
      .resolves.toMatchObject({ statusCode: 404 });
  });

  it('rejects a stored goal with the wrong entity key', async () => {
    documentClientMock.on(QueryCommand).resolves({
      Items: [{ ...storedGoal, entityKey: 'MEAL#wrong' }],
    });

    await expect(getEffectiveNutritionGoal('table', 'user-123', '2026-10-31'))
      .rejects.toThrow('Stored NutritionGoal has an invalid entity key');
  });

  it('deletes a goal by effective date', async () => {
    const response = await deleteNutritionGoal(
      'table',
      'user-123',
      '2026-10-19',
    );

    expect(response).toEqual({ statusCode: 204 });
    expect(documentClientMock.commandCalls(DeleteCommand)[0]?.args[0].input)
      .toMatchObject({
        Key: {
          entityKey: 'NUTRITION_GOAL#2026-10-19',
          userId: 'user-123',
        },
        TableName: 'table',
      });
  });

  it('rejects an invalid deletion date without deleting', async () => {
    await expect(deleteNutritionGoal('table', 'user-123', 'not-a-date'))
      .resolves.toMatchObject({ statusCode: 400 });
    expect(documentClientMock.commandCalls(DeleteCommand)).toHaveLength(0);
  });

  it('returns not found when deleting an absent goal', async () => {
    const missing = new Error('missing');
    missing.name = 'ConditionalCheckFailedException';
    documentClientMock.on(DeleteCommand).rejects(missing);

    await expect(deleteNutritionGoal('table', 'user-123', '2026-10-19'))
      .resolves.toMatchObject({ statusCode: 404 });
  });

  it('replaces a goal on the same future date', async () => {
    const body = JSON.stringify({ ...replacement, effectiveFrom: '2026-10-25' });
    const response = await replaceFutureNutritionGoal(
      'table',
      'user-123',
      '2026-10-25',
      body,
    );
    const goal = JSON.parse(response.body ?? '');

    expect(response.statusCode).toBe(200);
    expect(documentClientMock.commandCalls(PutCommand)[0]?.args[0].input)
      .toMatchObject({
        ConditionExpression:
          'attribute_exists(userId) AND attribute_exists(entityKey)',
        Item: { ...goal, entityKey: 'NUTRITION_GOAL#2026-10-25' },
      });
  });

  it('reschedules a future goal atomically', async () => {
    const response = await replaceFutureNutritionGoal(
      'table',
      'user-123',
      '2026-10-25',
      JSON.stringify(replacement),
    );
    const goal = JSON.parse(response.body ?? '');

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
              TableName: 'table',
            },
          },
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: { ...goal, entityKey: 'NUTRITION_GOAL#2026-11-01' },
              TableName: 'table',
            },
          },
        ],
      });
  });

  it.each([
    ['invalid previous date', 'bad-date', replacement],
    ['invalid body', '2026-10-25', null],
    ['past previous date', '2026-10-19', replacement],
    ['past destination date', '2026-10-25', { ...replacement, effectiveFrom: '2026-10-19' }],
  ])('rejects replacement with %s', async (_case, previousDate, input) => {
    const response = await replaceFutureNutritionGoal(
      'table',
      'user-123',
      previousDate,
      input === null ? '{' : JSON.stringify(input),
    );

    expect([400, 409]).toContain(response.statusCode);
    expect(documentClientMock.commandCalls(PutCommand)).toHaveLength(0);
    expect(documentClientMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
  });

  it('requires a profile before replacing a goal', async () => {
    documentClientMock.on(GetCommand).resolves({});

    await expect(replaceFutureNutritionGoal(
      'table',
      'user-123',
      '2026-10-25',
      JSON.stringify(replacement),
    )).resolves.toMatchObject({ statusCode: 409 });
  });

  it.each([
    [0, 404],
    [1, 409],
  ])('maps transaction condition %i to status %i', async (index, statusCode) => {
    documentClientMock.on(TransactWriteCommand).rejects(
      new TransactionCanceledException({
        $metadata: {},
        CancellationReasons: [0, 1].map((reasonIndex) => ({
          Code: reasonIndex === index ? 'ConditionalCheckFailed' : 'None',
        })),
        message: 'cancelled',
      }),
    );

    await expect(replaceFutureNutritionGoal(
      'table',
      'user-123',
      '2026-10-25',
      JSON.stringify(replacement),
    )).resolves.toMatchObject({ statusCode });
  });
});
