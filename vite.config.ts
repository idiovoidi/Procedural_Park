import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    open: false, // Let debugger control browser opening
    hmr: {
      overlay: true,
      port: 24678, // Use a specific port for HMR to avoid conflicts
    },
    watch: {
      usePolling: false, // Disable polling to prevent excessive file watching
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  css: {
    devSourcemap: true,
  },
  optimizeDeps: {
    include: ['three'],
  },
})
