/// <reference types="electron-vite/node" />

// electron-vite copies these and resolves the on-disk path at build time.
declare module '*?asset' {
  const src: string;
  export default src;
}
