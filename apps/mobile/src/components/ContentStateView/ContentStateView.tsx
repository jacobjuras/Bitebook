import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ContentStateKind } from '~/constants';
import type { ContentState } from '~/models';

import { useThemeColors } from '~/theme';
import { styles } from './styles';

/** Renders feedback when list content is loading, unavailable, or empty. */
export function ContentStateView({
  state,
  testIDPrefix,
}: {
  state: ContentState;
  testIDPrefix: string;
}) {
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
