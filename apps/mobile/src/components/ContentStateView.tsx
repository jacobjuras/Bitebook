import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../theme/useThemeColors';

type IconName = ComponentProps<typeof Ionicons>['name'];

export enum ContentStateKind {
  Loading = 'loading',
  Error = 'error',
  Empty = 'empty',
  NoResults = 'noResults',
}

export type ContentState =
  | { kind: ContentStateKind.Loading }
  | {
      kind: ContentStateKind.Error;
      message: string;
      onRetry: () => void;
    }
  | {
      description: string;
      icon: IconName;
      kind: ContentStateKind.Empty;
      title: string;
    }
  | {
      description: string;
      kind: ContentStateKind.NoResults;
      title: string;
    };

type ContentStateViewProps = {
  state: ContentState;
  testIDPrefix: string;
};

/** Renders feedback when list content is loading, unavailable, or empty. */
export function ContentStateView({ state, testIDPrefix }: ContentStateViewProps) {
  const colors = useThemeColors();

  switch (state.kind) {
    case ContentStateKind.Loading:
      return (
        // Loading indicator
        <ActivityIndicator
          color={colors.accent}
          style={styles.centeredState}
          testID={`${testIDPrefix}-loading-indicator`}
        />
      );
    case ContentStateKind.Error:
      return (
        <View style={styles.centeredState} testID={`${testIDPrefix}-error`}>
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            testID={`${testIDPrefix}-error-message`}
          >
            {state.message}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={state.onRetry}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: colors.control },
              pressed && styles.buttonPressed,
            ]}
            testID={`${testIDPrefix}-retry-button`}
          >
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      );
    case ContentStateKind.Empty:
      return (
        <View style={styles.emptyState} testID={`${testIDPrefix}-empty`}>
          <View
            style={[styles.iconCircle, { backgroundColor: colors.accentSubtle }]}
          >
            <Ionicons
              color={colors.accent}
              name={state.icon}
              size={30}
              testID={`${testIDPrefix}-empty-icon`}
            />
          </View>
          <Text
            style={[styles.emptyTitle, { color: colors.textPrimary }]}
            testID={`${testIDPrefix}-empty-title`}
          >
            {state.title}
          </Text>
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            testID={`${testIDPrefix}-empty-description`}
          >
            {state.description}
          </Text>
        </View>
      );
    case ContentStateKind.NoResults:
      return (
        <View style={styles.emptyState} testID={`${testIDPrefix}-no-results`}>
          <Text
            style={[styles.emptyTitle, { color: colors.textPrimary }]}
            testID={`${testIDPrefix}-no-results-title`}
          >
            {state.title}
          </Text>
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            testID={`${testIDPrefix}-no-results-description`}
          >
            {state.description}
          </Text>
        </View>
      );
    default:
      state satisfies never;
      throw new Error('Unsupported content state');
  }
}

const styles = StyleSheet.create({
  buttonPressed: { opacity: 0.75 },
  buttonText: { fontSize: 17, fontWeight: '600' },
  centeredState: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center' },
  description: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  emptyState: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  iconCircle: { alignItems: 'center', borderRadius: 30, height: 60, justifyContent: 'center', width: 60 },
  retryButton: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
});
