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
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          // Three.js and related libraries
          three: ['three'],
          'three-postprocessing': ['postprocessing'],
          // Vendor chunk for other dependencies
          vendor: ['three/examples/jsm/postprocessing/EffectComposer.js'],
        },
        // Optimize chunk naming and structure
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      // External dependencies that shouldn't be bundled
      external: [],
      // Tree shaking optimization
      treeshake: {
        preset: 'recommended',
        manualPureFunctions: ['console.log', 'console.warn'],
      },
    },
    // Enable code splitting
    chunkSizeWarningLimit: 1000,
  },
  css: {
    devSourcemap: false, // Disable CSS sourcemaps in production
  },
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/postprocessing/EffectComposer.js',
      'three/examples/jsm/postprocessing/RenderPass.js',
      'three/examples/jsm/postprocessing/ShaderPass.js',
    ],
    exclude: ['@types/three'], // Exclude type definitions from bundle
  },
  // Enable experimental features for better performance
  esbuild: {
    // Remove console logs in production build
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
})
