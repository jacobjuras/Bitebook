import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, gap: 8, padding: 14 },
  chip: {
    borderRadius: 8,
    fontSize: 12,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  detail: { fontSize: 14 },
  title: { flex: 1, fontSize: 17, fontWeight: '600' },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
});
