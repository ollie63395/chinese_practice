/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the built app works from any sub-path (e.g. GitHub Pages).
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    // The whole app is one ~195 KB (gzipped) bundle, cached after the first visit.
    // Splitting it would only add loading states, so don't warn about its size.
    chunkSizeWarningLimit: 800,
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    // These need local Supabase: `npm run test:db`.
    exclude: ['src/**/*.db.test.ts'],
  },
});
