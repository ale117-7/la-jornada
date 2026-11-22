import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el mismo build se carga por file:// dentro de Electron.
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        overlay: resolve(import.meta.dirname, 'overlay.html'),
      },
    },
  },
});
