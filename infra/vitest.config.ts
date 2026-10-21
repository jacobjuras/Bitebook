import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      exclude: ['{bin,lib}/**/tests/**'],
      include: ['lib/**/*.ts'],
      provider: 'v8',
      reportOnFailure: true,
      reporter: [['text', { maxCols: 200, skipFull: false }], 'json-summary', 'lcov'],
    },
    include: ['{bin,lib}/**/tests/*.test.ts', 'test/**/*.test.ts'],
    name: 'Infrastructure unit tests',
  },
});
