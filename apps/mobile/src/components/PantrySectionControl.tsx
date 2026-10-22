import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../theme/useThemeColors';

export enum PantrySection {
  Foods = 'foods',
  Meals = 'meals',
}

const sectionLabels: Record<PantrySection, string> = {
  [PantrySection.Foods]: 'Foods',
  [PantrySection.Meals]: 'Meals',
};

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
              {sectionLabels[section]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    borderRadius: 10,
    flexDirection: 'row',
    marginHorizontal: 24,
    padding: 3,
  },
  label: { fontSize: 15, fontWeight: '600' },
  tab: { alignItems: 'center', borderRadius: 8, flex: 1, padding: 8 },
});
