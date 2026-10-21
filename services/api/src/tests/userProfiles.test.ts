import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it } from 'vitest';

import { getUserProfile, putUserProfile } from '../userProfiles.js';
import {
  documentClientMock,
  resetDocumentClientMock,
  storedProfile,
} from './fixtures.js';

describe('userProfiles', () => {
  beforeEach(resetDocumentClientMock);

  it('gets the authenticated user profile', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedProfile, entityKey: 'PROFILE' },
    });

    const response = await getUserProfile('table', 'user-123');

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body ?? '')).toEqual({ profile: storedProfile });
    expect(documentClientMock.commandCalls(GetCommand)[0]?.args[0].input)
      .toEqual({
        Key: { entityKey: 'PROFILE', userId: 'user-123' },
        TableName: 'table',
      });
  });

  it('returns not found when the profile is absent', async () => {
    await expect(getUserProfile('table', 'user-123')).resolves.toMatchObject({
      statusCode: 404,
    });
  });

  it('rejects a stored item with the wrong entity key', async () => {
    documentClientMock.on(GetCommand).resolves({
      Item: { ...storedProfile, entityKey: 'PROFILE#other' },
    });

    await expect(getUserProfile('table', 'user-123')).rejects.toThrow(
      'Stored profile has an invalid entity key',
    );
  });

  it('updates profile fields and returns the stored profile', async () => {
    documentClientMock.on(UpdateCommand).resolves({
      Attributes: { ...storedProfile, entityKey: 'PROFILE' },
    });

    const response = await putUserProfile(
      'table',
      'user-123',
      JSON.stringify({ displayName: 'Jacob', timeZone: 'America/Los_Angeles' }),
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body ?? '')).toEqual({ profile: storedProfile });
    expect(documentClientMock.commandCalls(UpdateCommand)[0]?.args[0].input)
      .toMatchObject({
        Key: { entityKey: 'PROFILE', userId: 'user-123' },
        ReturnValues: 'ALL_NEW',
        TableName: 'table',
        UpdateExpression:
          'SET createdAt = if_not_exists(createdAt, :createdAt), #displayName = :displayName, #timeZone = :timeZone, updatedAt = :updatedAt',
      });
  });

  it('removes an omitted display name', async () => {
    documentClientMock.on(UpdateCommand).resolves({
      Attributes: {
        ...storedProfile,
        displayName: undefined,
        entityKey: 'PROFILE',
      },
    });

    await putUserProfile('table', 'user-123', JSON.stringify({ timeZone: 'UTC' }));

    expect(documentClientMock.commandCalls(UpdateCommand)[0]?.args[0].input)
      .toMatchObject({
        UpdateExpression:
          'SET createdAt = if_not_exists(createdAt, :createdAt), #timeZone = :timeZone, updatedAt = :updatedAt REMOVE #displayName',
      });
  });

  it.each([undefined, '{', JSON.stringify({ timeZone: 'Los Angeles' })])(
    'rejects invalid profile body %s',
    async (body) => {
      const response = await putUserProfile('table', 'user-123', body);

      expect(response.statusCode).toBe(400);
      expect(documentClientMock.commandCalls(UpdateCommand)).toHaveLength(0);
    },
  );

  it('fails when DynamoDB omits the updated attributes', async () => {
    await expect(
      putUserProfile('table', 'user-123', JSON.stringify({ timeZone: 'UTC' })),
    ).rejects.toThrow('DynamoDB did not return the updated profile');
  });
});
