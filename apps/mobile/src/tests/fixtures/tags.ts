import type { Tag } from '@bitebook/domain';

const createdAt = '2026-10-20T11:00:00.000Z';
const userId = 'user-123';

export const tagFixtures = {
  breakfast: {
    createdAt,
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    name: 'breakfast',
    normalizedName: 'breakfast',
    updatedAt: createdAt,
    userId,
  },
  fiber: {
    createdAt,
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'fiber',
    normalizedName: 'fiber',
    updatedAt: createdAt,
    userId,
  },
  highProtein: {
    createdAt,
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    name: 'high-protein',
    normalizedName: 'high-protein',
    updatedAt: createdAt,
    userId,
  },
  protein: {
    color: '#1A2B3C',
    createdAt,
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'protein',
    normalizedName: 'protein',
    updatedAt: createdAt,
    userId,
  },
  savory: {
    createdAt,
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    name: 'savory',
    normalizedName: 'savory',
    updatedAt: createdAt,
    userId,
  },
  unused: {
    createdAt,
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    name: 'unused',
    normalizedName: 'unused',
    updatedAt: createdAt,
    userId,
  },
} as const satisfies Record<string, Tag>;
