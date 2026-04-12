import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  main: {
    build: {
      outDir: 'dist-electron',
      // Use rollupOptions.input with an absolute path rather than build.lib.entry.
      // - A relative 'electron/…' string in rollupOptions.input matches
      //   electron-vite's /^electron\/.+/ external regex and is wrongly externalised.
      // - build.lib.entry triggered a Vite 6 patchConfig() bug: environments.ssr
      //   lib.formats ended up as ['es','es'] (base defaults concatenated with
      //   user overrides), causing a "multiple outputs" error.
      rollupOptions: {
        input: resolve(__dirname, 'electron/main.ts'),
        output: {
          format: 'es',
          entryFileNames: '[name].js',
        },
      },
    },
    // Vite 6 patchConfig() replaces resolved.build with
    // resolved.environments.ssr.build before configResolved() runs.
    // Mirror rollupOptions here so the entry and output format survive
    // the replacement and Rollup actually writes dist-electron/main.js.
    environments: {
      ssr: {
        build: {
          outDir: 'dist-electron',
          rollupOptions: {
            input: resolve(__dirname, 'electron/main.ts'),
            output: {
              format: 'es',
              entryFileNames: '[name].js',
            },
          },
        },
      },
    },
  },
  preload: {
    build: {
      outDir: 'dist-electron',
      // Both main and preload write to the same outDir.  Vite's default
      // emptyOutDir=true would wipe dist-electron/ at the start of the
      // preload build, deleting main.js.  Disable it here; main's build
      // (which runs first) still empties the directory on a clean run.
      emptyOutDir: false,
      lib: {
        entry: 'electron/preload.ts',
      },
    },
    // Mirror outDir + entry so patchConfig() doesn't lose them.
    // electron-vite always forces preload ES output to .mjs
    // (entryFileNames = [name].mjs), so main.ts references preload.mjs.
    environments: {
      ssr: {
        build: {
          outDir: 'dist-electron',
          lib: {
            entry: 'electron/preload.ts',
          },
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
