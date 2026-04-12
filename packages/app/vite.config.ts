import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Used by `npm run dev:web` and `npm run build:web` (plain Vite, no Electron).
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist/renderer',
    rollupOptions: {
      input: 'index.html',
    },
    target: 'es2022',
  },
  plugins: [vue()],
  server: {
    port: 5173,
  },
})
