import { reactNative } from 'vitest-native';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [reactNative({ engine: 'mock' })],
  test: {
    globals: true,
    include: ['test/**/*.test.{ts,tsx}'],
    name: 'Mobile tests',
    setupFiles: ['./test/setup.ts'],
  },
});
