import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      exclude: ['src/**/tests/**'],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reportOnFailure: true,
      reporter: [['text', { maxCols: 200, skipFull: false }], 'json-summary', 'lcov'],
    },
    include: ['src/**/tests/*.test.ts', 'test/**/*.test.ts'],
    name: 'Domain unit tests',
  },
});
