import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  main: {
    // Bundle the source-first workspace packages into the main/preload output;
    // their @xmcl/undici/zod deps stay externalized (they're real node_modules deps).
    plugins: [externalizeDepsPlugin({ exclude: ['@pilote/core', '@pilote/types'] })],
    build: {
      rollupOptions: {
        input: { index: resolve('electron/main/index.ts') },
      },
    },
    resolve: {
      alias: {
        '@main': resolve('electron/main'),
        '@shared': resolve('electron/shared'),
      },
    },
  },
  preload: {
    // Bundle the source-first workspace packages into the main/preload output;
    // their @xmcl/undici/zod deps stay externalized (they're real node_modules deps).
    plugins: [externalizeDepsPlugin({ exclude: ['@pilote/core', '@pilote/types'] })],
    build: {
      rollupOptions: {
        input: { index: resolve('electron/preload/index.ts') },
      },
    },
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: { index: resolve('index.html') },
      },
    },
    resolve: {
      alias: {
        '@': resolve('src'),
        '@renderer': resolve('src'),
      },
    },
    plugins: [vue()],
  },
});
