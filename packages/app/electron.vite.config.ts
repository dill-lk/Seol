import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    build: {
      outDir: 'dist-electron',
      // Use lib.entry (not rollupOptions.input) so the path is resolved to an
      // absolute path before rollup's external-module check runs. A relative
      // "electron/…" string in rollupOptions.input matches electron-vite's own
      // /^electron\/.+/ external regex and causes "cannot be external" errors.
      lib: {
        entry: 'electron/main.ts',
      },
    },
    // Vite 6 creates an empty `environments.ssr` when build.ssr=true is set by
    // the electron-vite plugin, then patchConfig() replaces resolved.build with
    // resolved.environments.ssr.build BEFORE configResolved() runs — stripping
    // build.lib.  Mirror the entry here so the check can find it.
    environments: {
      ssr: {
        build: {
          lib: { entry: 'electron/main.ts' },
        },
      },
    },
  },
  preload: {
    build: {
      outDir: 'dist-electron',
      lib: {
        entry: 'electron/preload.ts',
      },
    },
    environments: {
      ssr: {
        build: {
          lib: { entry: 'electron/preload.ts' },
        },
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
