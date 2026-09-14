import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';

// Versión real de package.json, inyectada en build time — así la propia app
// puede mostrar qué versión es (Ayuda, sidebar), sin mantenerla duplicada
// a mano en ningún archivo de src/.
const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));

export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Solo se usa corriendo esta demo como web pura (npm run dev sin Electron).
    // El backend standalone (server/standalone.js) escucha en 8001.
    proxy: {
      '/api': { target: 'http://127.0.0.1:8001', changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
