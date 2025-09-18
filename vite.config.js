import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? './' : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'assets': fileURLToPath(new URL('./assets', import.meta.url)),
    }
  },
  server: {
    port: 3000, // Default port 3000
    open: true, // Automatically open the browser
    host: true, // Allow connections from local network
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true, // Enable source maps for better debugging
    minify: 'terser', // Minify with terser for production
  },
  optimizeDeps: {
    include: ['three', 'gsap'], // Pre-bundle these dependencies
  },
  // Handle Three.js shader imports
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr'],
});
