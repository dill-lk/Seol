import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

/**
 * Resolve a path relative to the packaged resources root.
 * In production, `process.resourcesPath` points to the resources directory
 * inside the Electron bundle; in dev it falls back to the repository root.
 */
function resolvePath(...segments: string[]): string {
  return join(__dirname, ...segments)
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'SEOL',
    webPreferences: {
      preload: resolvePath('preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // In production load the built index.html; in dev use the Vite dev server.
  if (app.isPackaged) {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
  else {
    win.loadURL(process.env['VITE_DEV_SERVER_URL'] ?? 'http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  }

  // Open external links in the OS browser, not inside Electron.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return win
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked with no open windows.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Quit on all platforms except macOS (which keeps apps in the dock).
  if (process.platform !== 'darwin') app.quit()
})
