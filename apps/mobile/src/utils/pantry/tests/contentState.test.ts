import { describe, expect, it, vi } from 'vitest';

import { ContentStateKind } from '../../../constants/content-state-constants.js';
import { getContentState } from '../contentState.js';

const emptyState = {
  action: 'Add item',
  description: 'Create the first item',
  icon: 'nutrition-outline' as const,
  title: 'No items',
};

const noResultsState = {
  description: 'Change the search or filters',
  title: 'No matching items',
};

describe('getContentState', () => {
  it('returns loading before any lower-priority state', () => {
    expect(getContentState({
      emptyState,
      errorState: { message: 'Request failed', onRetry: vi.fn() },
      isPending: true,
      noResultsState,
    })).toEqual({ kind: ContentStateKind.Loading });
  });

  it('returns the error and retry action before result states', () => {
    const onRetry = vi.fn();

    expect(getContentState({
      emptyState,
      errorState: { message: 'Request failed', onRetry },
      isPending: false,
      noResultsState,
    })).toEqual({
      kind: ContentStateKind.Error,
      message: 'Request failed',
      onRetry,
    });
  });

  it('returns no results before the empty collection state', () => {
    expect(getContentState({
      emptyState,
      isPending: false,
      noResultsState,
    })).toEqual({
      ...noResultsState,
      kind: ContentStateKind.NoResults,
    });
  });

  it('maps empty-state display fields without its action', () => {
    expect(getContentState({ emptyState, isPending: false })).toEqual({
      description: emptyState.description,
      icon: emptyState.icon,
      kind: ContentStateKind.Empty,
      title: emptyState.title,
    });
  });

  it('returns null when content can be displayed', () => {
    expect(getContentState({ isPending: false })).toBeNull();
  });
});
