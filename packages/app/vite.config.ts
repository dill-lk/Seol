import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    build: {
      outDir: 'dist-electron',
      rollupOptions: {
        input: 'electron/main.ts',
      },
    },
  },
  preload: {
    build: {
      outDir: 'dist-electron',
      rollupOptions: {
        input: 'electron/preload.ts',
      },
    },
  },
  renderer: {
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
  },
})

