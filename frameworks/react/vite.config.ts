import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const app = process.env.APP || 'table';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, `apps/${app}`),
  build: {
    outDir: resolve(__dirname, `dist/${app}`),
    emptyOutDir: true,
  },
  resolve: {
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
