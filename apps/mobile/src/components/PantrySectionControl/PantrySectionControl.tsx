import { Pressable, Text, View } from 'react-native';

import { PantrySection, pantrySectionLabels } from '~/constants';
import { useThemeColors } from '~/theme';
import { styles } from './styles';

/** Selects which kind of pantry item is displayed. */
export function PantrySectionControl({
  onSelect,
  selectedSection,
  testIDPrefix,
}: {
  onSelect: (section: PantrySection) => void;
  selectedSection: PantrySection;
  testIDPrefix: string;
}) {
  const colors = useThemeColors();

  return (
    // Pantry section control
    <View
      style={[styles.control, { backgroundColor: colors.control }]}
      testID={`${testIDPrefix}-section-control`}
    >
      {Object.values(PantrySection).map((section) => {
        const selected = selectedSection === section;
        return (
          // Pantry section tab
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={section}
            onPress={() => onSelect(section)}
            testID={`${testIDPrefix}-${section}-tab`}
            style={[
              styles.tab,
              selected && { backgroundColor: colors.controlSelected },
            ]}
          >
            {/* Pantry section label */}
            <Text
              style={[
                styles.label,
                {
                  color: selected
                    ? colors.textPrimary
                    : colors.textSecondary,
                },
              ]}
            >
              {pantrySectionLabels[section]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
