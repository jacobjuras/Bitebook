import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['deployed/authentication.test.ts'],
    name: 'Production API smoke tests',
  },
});
