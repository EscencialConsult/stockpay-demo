import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'

// createRequire permite usar módulos CJS (tailwindcss, autoprefixer) desde un contexto ESM.
// Esto evita depender de la detección automática de postcss.config.cjs en Vite 8.
const require = createRequire(import.meta.url)

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        require('tailwindcss')({
          purge: ['./index.html', './src/**/*.{js,jsx}'],
          darkMode: false,
          theme: {
            extend: {
              fontFamily: {
                titulo: ['"Exo 2"', 'sans-serif'],
              },
            },
          },
          variants: { extend: {} },
          plugins: [],
        }),
        require('autoprefixer')(),
      ],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:       'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
