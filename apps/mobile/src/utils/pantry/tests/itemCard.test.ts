import { describe, expect, it, vi } from 'vitest';

vi.mock('~/components', () => ({
  FavoriteIndicator: 'FavoriteIndicator',
}));

import { FavoriteIndicator } from '~/components';
import { getItemCardOrganization } from '../itemCard.js';

describe('getItemCardOrganization', () => {
  it('omits card organization when metadata is absent', () => {
    expect(getItemCardOrganization({})).toEqual({
      accessory: undefined,
      chips: undefined,
    });
  });

  it('maps tags and favorite state into card presentation', () => {
    const organization = getItemCardOrganization({
      isFavorite: true,
      tags: ['breakfast', 'high-protein'],
    });

    expect(organization.chips).toEqual([
      { id: 'breakfast', label: 'breakfast' },
      { id: 'high-protein', label: 'high-protein' },
    ]);
    expect(organization.accessory?.('pantry-item')).toMatchObject({
      props: { testIDPrefix: 'pantry-item' },
      type: FavoriteIndicator,
    });
  });
});
