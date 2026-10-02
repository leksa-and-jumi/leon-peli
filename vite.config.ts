/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages under /<repo>/.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    // Phaser alone is ~1.2 MB minified; that is expected.
    chunkSizeWarningLimit: 1500,
    // Phaser is large; keep it in its own chunk.
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
