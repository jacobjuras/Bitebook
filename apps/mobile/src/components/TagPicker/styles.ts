import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  addTagChip: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  container: { gap: 14 },
  pressed: { opacity: 0.65 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
