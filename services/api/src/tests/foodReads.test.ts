import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it } from 'vitest';

import { getFood, listFoods, parseStoredFood } from '../foodReads.js';
import {
  documentClientMock,
  resetDocumentClientMock,
  storedFood,
} from './fixtures.js';

describe('foodReads', () => {
  beforeEach(resetDocumentClientMock);

  it('parses a stored Food without internal or legacy attributes', () => {
    expect(parseStoredFood({
      ...storedFood,
      currentStock: { amount: 12, unit: 'item' },
      entityKey: `FOOD#${storedFood.id}`,
    })).toEqual(storedFood);
  });

  it.each([undefined, 'MEAL#id', 42])(
    'rejects invalid entityKey %s',
    (entityKey) => {
      expect(() => parseStoredFood({ ...storedFood, entityKey })).toThrow(
        'Stored Food has an invalid entity key',
      );
    },
  );

  it('gets a Food with a consistent read when requested', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedFood, entityKey: `FOOD#${storedFood.id}` },
    });

    await expect(getFood('table', 'user-123', storedFood.id, true))
      .resolves.toEqual(storedFood);
    expect(documentClientMock.commandCalls(GetCommand)[0]?.args[0].input)
      .toEqual({
        ConsistentRead: true,
        Key: { entityKey: `FOOD#${storedFood.id}`, userId: 'user-123' },
        TableName: 'table',
      });
  });

  it('returns undefined when the Food is absent', async () => {
    await expect(getFood('table', 'user-123', storedFood.id))
      .resolves.toBeUndefined();
  });

  it('lists Foods from only the user Food key range', async () => {
    documentClientMock.on(QueryCommand).resolves({
      Items: [{ ...storedFood, entityKey: `FOOD#${storedFood.id}` }],
    });

    await expect(listFoods('table', 'user-123')).resolves.toEqual([storedFood]);
    expect(documentClientMock.commandCalls(QueryCommand)[0]?.args[0].input)
      .toEqual({
        ExpressionAttributeValues: {
          ':entityPrefix': 'FOOD#',
          ':userId': 'user-123',
        },
        KeyConditionExpression:
          'userId = :userId AND begins_with(entityKey, :entityPrefix)',
        TableName: 'table',
      });
  });
});
