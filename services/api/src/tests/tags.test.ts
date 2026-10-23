import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import {
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createTag,
  listTags,
  parseStoredTag,
  updateTag,
} from '../tags.js';
import {
  documentClientMock,
  resetDocumentClientMock,
  storedTag,
} from './fixtures.js';

function cancelledTransaction(): TransactionCanceledException {
  return new TransactionCanceledException({
    $metadata: {},
    CancellationReasons: [{ Code: 'None' }, { Code: 'ConditionalCheckFailed' }],
    message: 'cancelled',
  });
}

describe('Tags', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T02:00:00.000Z'));
    resetDocumentClientMock();
  });

  afterAll(() => vi.useRealTimers());

  it('parses only Tag records', () => {
    expect(parseStoredTag({
      ...storedTag,
      entityKey: `TAG#${storedTag.id}`,
    })).toEqual(storedTag);
    expect(() => parseStoredTag({
      ...storedTag,
      entityKey: `FOOD#${storedTag.id}`,
    })).toThrow('invalid entity key');
  });

  it('lists a user’s durable Tags alphabetically', async () => {
    const vegetableTag = {
      ...storedTag,
      id: '5b0d955c-af19-4e65-b767-83e2ee474d81',
      name: 'vegetable',
      normalizedName: 'vegetable',
    };
    documentClientMock.on(QueryCommand).resolves({
      Items: [
        { ...vegetableTag, entityKey: `TAG#${vegetableTag.id}` },
        { ...storedTag, entityKey: `TAG#${storedTag.id}` },
      ],
    });

    await expect(listTags('table', 'user-123')).resolves.toEqual([
      storedTag,
      vegetableTag,
    ]);
    expect(documentClientMock.commandCalls(QueryCommand)[0]?.args[0].input)
      .toEqual({
        ExpressionAttributeValues: {
          ':entityPrefix': 'TAG#',
          ':userId': 'user-123',
        },
        KeyConditionExpression:
          'userId = :userId AND begins_with(entityKey, :entityPrefix)',
        TableName: 'table',
      });
  });

  it('creates a normalized Tag and reserves its unique name', async () => {
    const response = await createTag(
      'table',
      'user-123',
      JSON.stringify({ color: '#abcdef', name: ' Protein ' }),
    );
    const tag = JSON.parse(response.body ?? '');

    expect(response.statusCode).toBe(201);
    expect(tag).toMatchObject({
      color: '#ABCDEF',
      name: 'Protein',
      normalizedName: 'protein',
      userId: 'user-123',
    });
    expect(documentClientMock.commandCalls(TransactWriteCommand)[0]?.args[0].input)
      .toEqual({
        TransactItems: [
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: { ...tag, entityKey: `TAG#${tag.id}` },
              TableName: 'table',
            },
          },
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: {
                entityKey: 'TAG_NAME#protein',
                tagId: tag.id,
                userId: 'user-123',
              },
              TableName: 'table',
            },
          },
        ],
      });
  });

  it.each([
    undefined,
    '{',
    '{}',
    JSON.stringify({ name: 'favorite' }),
    JSON.stringify({ color: '#ABCDEF' }),
    JSON.stringify({ color: 'blue', name: 'protein' }),
  ])('rejects invalid Tag creation body %s', async (body) => {
    const response = await createTag('table', 'user-123', body);

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(TransactWriteCommand)).toHaveLength(0);
  });

  it('returns a conflict when a Tag name is already reserved', async () => {
    documentClientMock.on(TransactWriteCommand).rejects(cancelledTransaction());

    await expect(createTag(
      'table',
      'user-123',
      JSON.stringify({ name: 'protein' }),
    )).resolves.toEqual({
      body: JSON.stringify({ message: 'A Tag with this name already exists' }),
      headers: { 'content-type': 'application/json' },
      statusCode: 409,
    });
  });

  it('updates color without replacing the name reservation', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedTag, entityKey: `TAG#${storedTag.id}` },
    });

    const response = await updateTag(
      'table',
      'user-123',
      storedTag.id,
      JSON.stringify({ color: '#fedcba' }),
    );
    const tag = JSON.parse(response.body ?? '').tag;

    expect(response.statusCode).toBe(200);
    expect(tag).toEqual({
      ...storedTag,
      color: '#FEDCBA',
      updatedAt: '2026-10-23T02:00:00.000Z',
    });
    expect(documentClientMock.commandCalls(TransactWriteCommand)[0]?.args[0].input)
      .toEqual({
        TransactItems: [{
          Put: {
            ConditionExpression: 'updatedAt = :expectedUpdatedAt',
            ExpressionAttributeValues: {
              ':expectedUpdatedAt': storedTag.updatedAt,
            },
            Item: { ...tag, entityKey: `TAG#${storedTag.id}` },
            TableName: 'table',
          },
        }],
      });
  });

  it('atomically renames a Tag and moves its unique-name reservation', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedTag, entityKey: `TAG#${storedTag.id}` },
    });

    const response = await updateTag(
      'table',
      'user-123',
      storedTag.id,
      JSON.stringify({ name: ' Lean Protein ' }),
    );
    const tag = JSON.parse(response.body ?? '').tag;

    expect(response.statusCode).toBe(200);
    expect(tag).toMatchObject({
      name: 'Lean Protein',
      normalizedName: 'lean protein',
    });
    expect(documentClientMock.commandCalls(TransactWriteCommand)[0]?.args[0].input)
      .toEqual({
        TransactItems: [
          {
            Put: {
              ConditionExpression: 'updatedAt = :expectedUpdatedAt',
              ExpressionAttributeValues: {
                ':expectedUpdatedAt': storedTag.updatedAt,
              },
              Item: { ...tag, entityKey: `TAG#${storedTag.id}` },
              TableName: 'table',
            },
          },
          {
            Delete: {
              ConditionExpression: 'tagId = :tagId',
              ExpressionAttributeValues: { ':tagId': storedTag.id },
              Key: {
                entityKey: `TAG_NAME#${storedTag.normalizedName}`,
                userId: 'user-123',
              },
              TableName: 'table',
            },
          },
          {
            Put: {
              ConditionExpression:
                'attribute_not_exists(userId) AND attribute_not_exists(entityKey)',
              Item: {
                entityKey: 'TAG_NAME#lean protein',
                tagId: storedTag.id,
                userId: 'user-123',
              },
              TableName: 'table',
            },
          },
        ],
      });
  });

  it('updates display capitalization without moving the name reservation', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedTag, entityKey: `TAG#${storedTag.id}` },
    });

    const response = await updateTag(
      'table',
      'user-123',
      storedTag.id,
      JSON.stringify({ name: 'Protein' }),
    );
    const tag = JSON.parse(response.body ?? '').tag;

    expect(response.statusCode).toBe(200);
    expect(tag).toMatchObject({ name: 'Protein', normalizedName: 'protein' });
    expect(documentClientMock.commandCalls(TransactWriteCommand)[0]?.args[0].input)
      .toMatchObject({
        TransactItems: [{
          Put: {
            Item: expect.objectContaining({
              name: 'Protein',
              normalizedName: 'protein',
            }),
          },
        }],
      });
  });

  it.each([
    ['invalid ID', 'not-a-uuid', JSON.stringify({ name: 'new' })],
    ['malformed body', storedTag.id, '{'],
    ['empty update', storedTag.id, '{}'],
  ])('rejects a Tag update with %s', async (_case, tagId, body) => {
    const response = await updateTag('table', 'user-123', tagId, body);

    expect(response.statusCode).toBe(400);
    expect(documentClientMock.commandCalls(GetCommand)).toHaveLength(0);
  });

  it('returns not found for an absent Tag', async () => {
    await expect(updateTag(
      'table',
      'user-123',
      storedTag.id,
      JSON.stringify({ name: 'new' }),
    )).resolves.toMatchObject({ statusCode: 404 });
  });

  it('returns a conflict when a Tag changes during an edit', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedTag, entityKey: `TAG#${storedTag.id}` },
    });
    documentClientMock.on(TransactWriteCommand).rejects(cancelledTransaction());

    await expect(updateTag(
      'table',
      'user-123',
      storedTag.id,
      JSON.stringify({ name: 'lean protein' }),
    )).resolves.toMatchObject({ statusCode: 409 });
  });
});
