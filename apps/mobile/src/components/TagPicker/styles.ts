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
  availableTagChip: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cancelTagButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  container: { gap: 14 },
  newTagChip: {
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  pressed: { opacity: 0.65 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  tagChip: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tagChipInput: {
    fontSize: 14,
    padding: 0,
  },
  tagInputChip: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 34,
    paddingLeft: 10,
  },
  tagInputMeasurement: {
    fontSize: 14,
    opacity: 0,
    position: 'absolute',
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
