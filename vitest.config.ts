import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Single-fork pool: 25 workers were spawning in parallel and timing out
    // waiting for each worker to respond. Running sequentially avoids that.
    pool: 'forks',
    // Vitest 4+: poolOptions was removed; singleFork is a top-level option.
    singleFork: true,
    include: [
      'src/capabilities/__tests__/**/*.test.ts',
      'src/adapters/native/__tests__/**/*.test.ts',
      'src/lib/__tests__/**/*.test.ts',
      'src/components/__tests__/**/*.test.tsx',
      'src/store/__tests__/**/*.test.ts',
      'src/hooks/__tests__/**/*.test.tsx',
    ],
    environmentMatchGlobs: {
      'src/components/**': 'jsdom',
      'src/hooks/**': 'jsdom',
      'src/store/**': 'jsdom',
    },
    setupFiles: [path.resolve(import.meta.dirname, './src/lib/__tests__/setup.ts')],
    coverage: {
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
