import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base URL for assets in production
  base: './',
  
  // Build configuration
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate source maps for debugging
    sourcemap: true,
    
    // Minify for production
    minify: 'esbuild',
    
    // Target modern browsers for better performance
    target: 'es2020',
    
    // Chunk size warning limit (increased for games)
    chunkSizeWarningLimit: 2000,
    
    // Rollup options for optimization
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        // Manual chunking for better caching
        manualChunks: {
          three: ['three'],
          postprocessing: ['postprocessing'],
          howler: ['howler'],
          vendor: ['stats.js']
        }
      }
    },
    
    // Assets handling
    assetsDir: 'assets',
    
    // Enable/disable CSS code splitting
    cssCodeSplit: true
  },
  
  // Development server configuration
  server: {
    port: 3000,
    host: true,
    open: true,
    cors: true,
    // Enable HMR for faster development
    hmr: {
      overlay: true
    }
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
    host: true,
    open: true
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/core': resolve(__dirname, 'src/core'),
      '@/game': resolve(__dirname, 'src/game'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/assets': resolve(__dirname, 'src/assets'),
      '@/shaders': resolve(__dirname, 'src/shaders'),
      '@/audio': resolve(__dirname, 'src/audio'),
      '@/ui': resolve(__dirname, 'src/ui')
    }
  },
  
  // Asset handling
  assetsInclude: [
    '**/*.glb',
    '**/*.gltf',
    '**/*.hdr',
    '**/*.exr',
    '**/*.mp3',
    '**/*.wav',
    '**/*.ogg',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.png',
    '**/*.webp',
    '**/*.svg'
  ],
  
  // CSS configuration
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // Optimization configuration
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/controls/OrbitControls',
      'three/examples/jsm/loaders/GLTFLoader',
      'three/examples/jsm/loaders/TextureLoader',
      'postprocessing',
      'howler',
      'stats.js'
    ],
    exclude: []
  },
  
  // Define global constants
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production')
  },
  
  // Enable esbuild for faster builds
  esbuild: {
    target: 'es2020',
    format: 'esm'
  }
});