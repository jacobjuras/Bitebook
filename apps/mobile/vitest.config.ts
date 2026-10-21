import { reactNative } from 'vitest-native';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [reactNative({ engine: 'mock' })],
  test: {
    coverage: {
      enabled: true,
      exclude: ['src/**/tests/**'],
      include: ['src/**/*.{ts,tsx}'],
      provider: 'v8',
      reportOnFailure: true,
      reporter: [['text', { maxCols: 200, skipFull: false }], 'json-summary', 'lcov'],
    },
    globals: true,
    include: ['src/**/tests/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    name: 'Mobile tests',
    setupFiles: ['./test/setup.ts'],
  },
});
