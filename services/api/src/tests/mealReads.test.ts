import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it } from 'vitest';

import { getMeal, listMeals, parseStoredMeal } from '../mealReads.js';
import {
  documentClientMock,
  resetDocumentClientMock,
  storedMeal,
} from './fixtures.js';

describe('mealReads', () => {
  beforeEach(resetDocumentClientMock);

  it('parses a stored Meal without its entity key', () => {
    expect(parseStoredMeal({
      ...storedMeal,
      entityKey: `MEAL#${storedMeal.id}`,
    })).toEqual(storedMeal);
  });

  it('rejects a stored item with a non-Meal entity key', () => {
    expect(() => parseStoredMeal({ ...storedMeal, entityKey: 'FOOD#id' }))
      .toThrow('Stored Meal has an invalid entity key');
  });

  it('gets a Meal with a consistent read when requested', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedMeal, entityKey: `MEAL#${storedMeal.id}` },
    });

    await expect(getMeal('table', 'user-123', storedMeal.id, true))
      .resolves.toEqual(storedMeal);
    expect(documentClientMock.commandCalls(GetCommand)[0]?.args[0].input)
      .toEqual({
        ConsistentRead: true,
        Key: { entityKey: `MEAL#${storedMeal.id}`, userId: 'user-123' },
        TableName: 'table',
      });
  });

  it('returns undefined when the Meal is absent', async () => {
    await expect(getMeal('table', 'user-123', storedMeal.id))
      .resolves.toBeUndefined();
  });

  it('lists Meals from only the user Meal key range', async () => {
    documentClientMock.on(QueryCommand).resolves({
      Items: [{ ...storedMeal, entityKey: `MEAL#${storedMeal.id}` }],
    });

    await expect(listMeals('table', 'user-123')).resolves.toEqual([storedMeal]);
    expect(documentClientMock.commandCalls(QueryCommand)[0]?.args[0].input)
      .toMatchObject({
        ExpressionAttributeValues: {
          ':entityPrefix': 'MEAL#',
          ':userId': 'user-123',
        },
        TableName: 'table',
      });
  });
});
