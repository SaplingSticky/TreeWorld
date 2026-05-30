import { contextBridge, ipcRenderer } from 'electron'

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => process.platform,

  // Window controls
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  isElectron: true,

  // File system (sandboxed)
  showSaveDialog: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke('show-open-dialog', options),
  writeFile: (path: string, data: string) => ipcRenderer.invoke('write-file', path, data),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),

  // Global shortcut listener
  onGlobalShortcut: (callback: (shortcut: string) => void) => {
    ipcRenderer.on('global-shortcut', (_event, shortcut) => callback(shortcut))
  },
})
