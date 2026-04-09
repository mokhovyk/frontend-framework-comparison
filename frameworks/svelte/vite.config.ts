import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

const app = process.env.APP || 'table';

export default defineConfig({
  plugins: [svelte()],
  root: resolve(__dirname, `apps/${app}`),
  build: {
    outDir: resolve(__dirname, `dist/${app}`),
    emptyOutDir: true,
  },
  resolve: {
    dedupe: ['svelte'],
    conditions: ['browser'],
    alias: {
      'shared-data': resolve(__dirname, '../../packages/shared-data/src'),
      'shared-css': resolve(__dirname, '../../packages/shared-css'),
    },
  },
  server: {
    port: 3000,
    strictPort: false,
  },
});
