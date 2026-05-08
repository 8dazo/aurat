import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  python: {
    request: (endpoint: string, body?: unknown, timeoutMs?: number) =>
      ipcRenderer.invoke('python:request', { endpoint, body, timeoutMs }),
    onScreencastFrame: (callback: (frame: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, frame: string) => callback(frame)
      ipcRenderer.on('python:screencast-frame', handler)
      return () => ipcRenderer.removeListener('python:screencast-frame', handler)
    },
    onLog: (callback: (log: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, log: string) => callback(log)
      ipcRenderer.on('python:log', handler)
      return () => ipcRenderer.removeListener('python:log', handler)
    },
    sendInput: (event: unknown) =>
      ipcRenderer.send('python:input', event),
  },
  db: {
    getProfile: () => ipcRenderer.invoke('db:getProfile'),
    saveProfile: (data: unknown) => ipcRenderer.invoke('db:saveProfile', data),
    getHistory: (filters?: unknown) => ipcRenderer.invoke('db:getHistory', filters),
    saveHistory: (entry: unknown) => ipcRenderer.invoke('db:saveHistory', entry),
    getQnaMemory: (questionHash: string) => ipcRenderer.invoke('db:getQnaMemory', questionHash),
    saveQnaMemory: (questionHash: string, question: string, answer: string, appId: number) =>
      ipcRenderer.invoke('db:saveQnaMemory', { questionHash, question, answer, appId }),
  },
  app: {
    getPlatform: () => process.platform,
    isPackaged: () => ipcRenderer.sendSync('app:isPackaged'),
  },
})