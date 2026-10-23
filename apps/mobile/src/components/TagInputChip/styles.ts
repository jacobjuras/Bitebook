import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  chip: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 34,
    paddingLeft: 10,
  },
  input: {
    fontSize: 14,
    padding: 0,
  },
  measurement: {
    fontSize: 14,
    opacity: 0,
    position: 'absolute',
  },
  pressed: { opacity: 0.65 },
});
