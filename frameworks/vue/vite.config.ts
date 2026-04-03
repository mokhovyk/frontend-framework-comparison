import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      'shared-data': resolve(__dirname, '../../packages/shared-data/src'),
      'shared-css': resolve(__dirname, '../../packages/shared-css'),
    },
  },
});
