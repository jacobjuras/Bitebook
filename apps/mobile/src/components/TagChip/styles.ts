import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  available: { borderWidth: 1 },
  chip: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pending: {
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  pressed: { opacity: 0.65 },
  text: { fontSize: 14 },
});
