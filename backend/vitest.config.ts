import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.json'],
  },
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'vmForks',
    globalSetup: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
