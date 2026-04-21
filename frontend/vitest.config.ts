import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export -- Vitest convention: vitest.config.ts must default-export defineConfig
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['components/**', 'lib/**', 'app/**'],
      exclude: ['**/*.test.*', '**/*.d.ts', '**/node_modules/**'],
    },
  },
});
