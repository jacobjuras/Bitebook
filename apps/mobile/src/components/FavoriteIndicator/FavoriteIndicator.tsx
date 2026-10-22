import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { useThemeColors } from '~/theme';

type FavoriteIndicatorProps = {
  testIDPrefix: string;
};

/** Marks an item as one of the user's favorites. */
export function FavoriteIndicator({ testIDPrefix }: FavoriteIndicatorProps) {
  const colors = useThemeColors();

  return (
    <View
      accessibilityLabel="Favorite"
      accessibilityRole="image"
      testID={`${testIDPrefix}-favorite-indicator`}
    >
      <Ionicons
        accessible={false}
        color={colors.accent}
        name="star"
        size={22}
        testID={`${testIDPrefix}-favorite-icon`}
      />
    </View>
  );
}
