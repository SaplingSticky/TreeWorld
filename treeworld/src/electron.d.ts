export interface ElectronAPI {
  getAppVersion: () => Promise<string>
  getPlatform: string
  minimizeToTray: () => void
  isElectron: boolean
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>
  showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>
  writeFile: (path: string, data: string) => Promise<void>
  readFile: (path: string) => Promise<string>
  onGlobalShortcut: (callback: (shortcut: string) => void) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
