import { defineConfig } from 'vite';

export default defineConfig({
  // data/ sits above the package; Vite must be allowed to serve it.
  server: { fs: { allow: ['../..'] } },
});
