import { describe, expect, it, vi } from 'vitest';

import { tagFixtures } from '~/tests/fixtures/tags';

vi.mock('~/components', () => ({
  FavoriteIndicator: 'FavoriteIndicator',
}));

import { FavoriteIndicator } from '~/components';
import { getItemCardOrganization } from '../itemCard.js';

const tag = tagFixtures.breakfast;
const tagsById = new Map([[tag.id, tag]]);

describe('getItemCardOrganization', () => {
  it('omits card organization when metadata is absent', () => {
    expect(getItemCardOrganization({}, tagsById)).toEqual({
      accessory: undefined,
      chips: undefined,
    });
  });

  it('resolves Tag IDs and favorite state into card presentation', () => {
    const organization = getItemCardOrganization({
      isFavorite: true,
      tagIds: [tag.id, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
    }, tagsById);

    expect(organization.chips).toEqual([
      { id: tag.id, label: 'breakfast' },
    ]);
    expect(organization.accessory?.('pantry-item')).toMatchObject({
      props: { testIDPrefix: 'pantry-item' },
      type: FavoriteIndicator,
    });
  });
});
