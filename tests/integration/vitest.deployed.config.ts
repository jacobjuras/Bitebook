import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['deployed/**/*.test.ts'],
    name: 'Deployed API integration tests',
    testTimeout: 30_000,
  },
});
