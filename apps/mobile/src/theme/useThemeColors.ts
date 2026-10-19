import { useColorScheme } from 'react-native';

import { themeColors } from './colors';

export function useThemeColors() {
  return themeColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
