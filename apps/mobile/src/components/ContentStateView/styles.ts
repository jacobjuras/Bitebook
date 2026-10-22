import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  buttonPressed: { opacity: 0.75 },
  buttonText: { fontSize: 17, fontWeight: '600' },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
  },
  description: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  retryButton: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
});
