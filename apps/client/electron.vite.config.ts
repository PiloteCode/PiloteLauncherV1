import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import obfuscator from 'vite-plugin-javascript-obfuscator';

/**
 * The shipped renderer bundle is obfuscated on production builds only (dev stays readable
 * for HMR/debugging). It renames identifiers + compacts, but deliberately keeps
 * `stringArray` OFF: encoding string literals rewrites dynamic-import specifiers
 * (`import('@/views/...')`) into function calls, which stops Vite from resolving the `@`
 * alias and breaks routing at runtime. Identifier renaming alone keeps the code unreadable
 * without touching imports.
 */
const obfuscate = () =>
  obfuscator({
    apply: 'build',
    options: {
      compact: true,
      simplify: true,
      identifierNamesGenerator: 'hexadecimal',
      stringArray: false,
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
          // Emit a CommonJS `index.cjs`. The package is `"type": "module"`, so a `.js`
          // preload is treated as ESM and Electron's `require()`-based preload loader rejects
          // it ("require() of ES Module"). The `.cjs` extension forces CommonJS unambiguously.
          output: { format: 'cjs', entryFileNames: 'index.cjs', inlineDynamicImports: true },
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
