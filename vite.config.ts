import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { generatedFiles, hostingPreview } from './build/hostingPreview';

// zustand is shared by the app's store and R3F, and the preload helper by every lazy import: both must sit
// in the always-loaded core chunk, or Rollup places them in "three" and every page then preloads three.js.
const CORE =
  /node_modules[\\/](react|react-dom|react-router|scheduler|cookie|set-cookie-parser|zustand|use-sync-external-store)[\\/]|vite\/preload-helper/;
const THREE =
  /node_modules[\\/](three|@react-three|three-stdlib|react-reconciler|its-fine|suspend-react|@monogrid|troika-|meshline|maath|camera-controls|stats-gl|detect-gpu)/;
const MOTION = /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/;

export default defineConfig({
  plugins: [react(), tailwindcss(), hostingPreview(), generatedFiles()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    // scripts/prerender.ts reads it to preload each route's chunks.
    manifest: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // three.js + R3F live in their own chunk, fetched only when a WebGL scene mounts.
        manualChunks(id) {
          if (THREE.test(id)) return 'three';
          if (CORE.test(id)) return 'react';
          if (MOTION.test(id)) return 'motion';
        },
      },
    },
  },
});
