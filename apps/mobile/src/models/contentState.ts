import type { EmptyState } from './emptyState';
import { ContentStateKind } from '../constants/content-state-constants';

export type ContentState =
  | { kind: ContentStateKind.Loading }
  | {
      kind: ContentStateKind.Error;
      message: string;
      onRetry: () => void;
    }
  | Omit<EmptyState, 'action'> & { kind: ContentStateKind.Empty }
  | {
      description: string;
      kind: ContentStateKind.NoResults;
      title: string;
    };
