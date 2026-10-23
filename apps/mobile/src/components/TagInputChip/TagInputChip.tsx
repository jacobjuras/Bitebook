import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  TAG_INPUT_CHIP_MAX_WIDTH,
  TAG_INPUT_CHIP_MIN_WIDTH,
} from '~/constants';
import type { TagInputChipModel } from '~/models';
import { useThemeColors } from '~/theme';

import { styles } from './styles';

/** Collects one Tag name in a dynamically sized inline chip. */
export function TagInputChip({
  model,
  testIDPrefix,
}: {
  model: TagInputChipModel;
  testIDPrefix: string;
}) {
  const colors = useThemeColors();
  const [inputWidth, setInputWidth] = useState(TAG_INPUT_CHIP_MIN_WIDTH);

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.background,
          borderColor: model.isInvalid ? colors.danger : colors.border,
        },
      ]}
      testID={`${testIDPrefix}-tag-input-container`}
    >
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onLayout={({ nativeEvent }) => {
          setInputWidth(Math.min(
            TAG_INPUT_CHIP_MAX_WIDTH,
            Math.max(
              TAG_INPUT_CHIP_MIN_WIDTH,
              Math.ceil(nativeEvent.layout.width) + 4,
            ),
          ));
        }}
        pointerEvents="none"
        style={styles.measurement}
        testID={`${testIDPrefix}-tag-input-measurement`}
      >
        {model.value || 'Tag name'}
      </Text>
      <TextInput
        accessibilityLabel="Optional tag"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        maxLength={30}
        onBlur={model.onBlur}
        onChangeText={model.onChange}
        onSubmitEditing={model.onSubmit}
        placeholder="Tag name"
        returnKeyType="done"
        style={[
          styles.input,
          { color: colors.textPrimary, width: inputWidth },
        ]}
        testID={`${testIDPrefix}-tag-input`}
        value={model.value}
      />
      <Pressable
        accessibilityLabel="Cancel tag entry"
        accessibilityRole="button"
        hitSlop={8}
        onPress={model.onCancel}
        style={({ pressed }) => [
          styles.cancelButton,
          pressed && styles.pressed,
        ]}
        testID={`${testIDPrefix}-cancel-tag-button`}
      >
        <Ionicons color={colors.textSecondary} name="close" size={14} />
      </Pressable>
    </View>
  );
}
