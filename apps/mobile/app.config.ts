import type { ExpoConfig } from 'expo/config';

import colorValues from './src/theme/colorValues.json';

const config: ExpoConfig = {
  name: 'Bitebook',
  slug: 'bitebook',
  scheme: 'bitebook',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: colorValues.brand.adaptiveIconBackground,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: ['expo-router', 'expo-secure-store'],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
