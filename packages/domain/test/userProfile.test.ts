import { describe, expect, it } from 'vitest';

import { userProfileSchema } from '../src/index.js';

const validProfile = {
  userId: 'user-123',
  displayName: 'Jacob',
  timeZone: 'America/Los_Angeles',
  createdAt: '2026-10-19T01:00:00Z',
  updatedAt: '2026-10-19T01:00:00Z',
};

describe('userProfileSchema', () => {
  it('accepts a profile with an IANA time zone', () => {
    expect(userProfileSchema.parse(validProfile)).toEqual(validProfile);
  });

  it('allows the display name to be omitted', () => {
    const { displayName: _, ...profile } = validProfile;

    expect(userProfileSchema.parse(profile)).toEqual(profile);
  });

  it.each(['UTC-8', 'not-a-time-zone'])(
    'rejects an invalid time zone: %s',
    (timeZone) => {
      expect(
        userProfileSchema.safeParse({ ...validProfile, timeZone }).success,
      ).toBe(false);
    },
  );

  it('rejects an empty display name', () => {
    expect(
      userProfileSchema.safeParse({
        ...validProfile,
        displayName: '   ',
      }).success,
    ).toBe(false);
  });
});
