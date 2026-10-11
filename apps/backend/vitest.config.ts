import { defineConfig } from 'vitest/config';

process.env.DATABASE_URL ??= 'postgresql://pc:pc@localhost:5432/pocketcanteen_test';

export default defineConfig({
  test: {
    globalSetup: ['test/globalSetup.ts'],
    setupFiles: ['test/setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
