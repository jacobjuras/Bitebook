import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  activeFilterChip: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeFilterText: { fontSize: 13, fontWeight: '500' },
  activeFilters: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 24,
    marginTop: 10,
  },
  buttonPressed: { opacity: 0.75 },
  controls: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 24,
    marginTop: 16,
  },
  filterSortButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  searchField: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12 },
});
