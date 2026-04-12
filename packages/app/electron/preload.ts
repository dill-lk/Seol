import { contextBridge } from 'electron'

/**
 * SEOL Electron preload script.
 *
 * All IPC handlers for Ollama process management and future features
 * will be exposed here via contextBridge so the renderer can call them
 * without nodeIntegration enabled.
 *
 * Example (uncomment when IPC handlers are added to main.ts):
 *
 *   contextBridge.exposeInMainWorld('seolBridge', {
 *     ollamaStart: () => ipcRenderer.invoke('ollama:start'),
 *     ollamaStop:  () => ipcRenderer.invoke('ollama:stop'),
 *   })
 */

// Expose an empty bridge for now so renderer code can safely check
// whether it is running inside Electron.
contextBridge.exposeInMainWorld('seolBridge', {
  isElectron: true,
})
