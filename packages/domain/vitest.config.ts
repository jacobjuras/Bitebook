import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      include: ['src/**/*.ts'],
      provider: 'v8',
      reportOnFailure: true,
      reporter: [['text', { maxCols: 200, skipFull: false }], 'json-summary', 'lcov'],
    },
    name: 'Domain unit tests',
  },
});
