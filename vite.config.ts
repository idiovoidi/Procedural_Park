import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  // Base path for GitHub Pages deployment
  // Set to repository name for GitHub Pages: '/Procedural_Park/'
  // Leave as '/' for Vercel, Netlify, or custom domain
  base: '/Procedural_Park/',
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/core'),
      '@systems': path.resolve(__dirname, './src/systems'),
      '@rendering': path.resolve(__dirname, './src/rendering'),
      '@ui': path.resolve(__dirname, './src/ui'),
      '@multiplayer': path.resolve(__dirname, './src/multiplayer'),
      '@game': path.resolve(__dirname, './src/game'),
      buffer: 'buffer',
      process: 'process/browser',
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
        // Only mark console as pure functions in production
        manualPureFunctions: process.env.NODE_ENV === 'production' ? ['console.log', 'console.warn'] : [],
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
      'simple-peer',
      'buffer',
      'process/browser',
      'events',
    ],
    exclude: ['@types/three'], // Exclude type definitions from bundle
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  // Enable experimental features for better performance
  esbuild: {
    // Remove console logs in production build only
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
  },
})
