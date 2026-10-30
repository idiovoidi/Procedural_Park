import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts: the browser polyfill aliases there (buffer, process)
// are not wanted in the Node test environment.
export default defineConfig({
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/core'),
      '@systems': path.resolve(__dirname, './src/systems'),
      '@rendering': path.resolve(__dirname, './src/rendering'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@multiplayer': path.resolve(__dirname, './src/multiplayer'),
      '@game': path.resolve(__dirname, './src/game'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    clearMocks: true,
  },
})
