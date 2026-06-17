import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import obfuscator from 'vite-plugin-javascript-obfuscator';

/**
 * The shipped renderer bundle is obfuscated on production builds only (dev stays readable
 * for HMR/debugging). Settings are deliberately moderate — identifier renaming + a base64
 * string array — to make the code hard to read without the aggressive transforms
 * (control-flow flattening, self-defending) that tend to break Vue at runtime.
 */
const obfuscate = () =>
  obfuscator({
    apply: 'build',
    options: {
      compact: true,
      simplify: true,
      identifierNamesGenerator: 'hexadecimal',
      stringArray: true,
      stringArrayThreshold: 0.75,
      stringArrayEncoding: ['base64'],
      controlFlowFlattening: false,
      deadCodeInjection: false,
      selfDefending: false,
      debugProtection: false,
      disableConsoleOutput: false,
      splitStrings: false,
    },
  });

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  return {
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
      // Obfuscate only the production renderer build.
      plugins: isBuild ? [vue(), obfuscate()] : [vue()],
    },
  };
});
