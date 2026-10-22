import { ContentStateKind } from '../../constants/content-state-constants';
import type { ContentState } from '../../models/contentState';
import type { EmptyState } from '../../models/emptyState';

export function getContentState({
  emptyState,
  errorState,
  isPending,
  noResultsState,
}: {
  emptyState?: EmptyState;
  errorState?: { message: string; onRetry: () => void };
  isPending: boolean;
  noResultsState?: { description: string; title: string };
}): ContentState | null {
  if (isPending) return { kind: ContentStateKind.Loading };
  if (errorState) return { kind: ContentStateKind.Error, ...errorState };
  if (noResultsState) {
    return { kind: ContentStateKind.NoResults, ...noResultsState };
  }
  if (emptyState) {
    return {
      description: emptyState.description,
      icon: emptyState.icon,
      kind: ContentStateKind.Empty,
      title: emptyState.title,
    };
  }
  return null;
}
