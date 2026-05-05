export const electronAPI = {
  python: {
    request: async (endpoint: string, body?: unknown): Promise<unknown> => {
      if (typeof window !== 'undefined' && window.electronAPI?.python?.request) {
        return window.electronAPI.python.request(endpoint, body)
      }
      throw new Error('Running in browser - Electron IPC not available')
    },
    onScreencastFrame: (callback: (frame: string) => void): (() => void) => {
      if (typeof window !== 'undefined' && window.electronAPI?.python?.onScreencastFrame) {
        return window.electronAPI.python.onScreencastFrame(callback)
      }
      return () => {}
    },
    onLog: (callback: (log: string) => void): (() => void) => {
      if (typeof window !== 'undefined' && window.electronAPI?.python?.onLog) {
        return window.electronAPI.python.onLog(callback)
      }
      return () => {}
    },
    sendInput: (event: unknown): void => {
      if (typeof window !== 'undefined' && window.electronAPI?.python?.sendInput) {
        window.electronAPI.python.sendInput(event)
      }
    },
  },
  db: {
    getProfile: async () => {
      if (typeof window !== 'undefined' && window.electronAPI?.db?.getProfile) {
        return window.electronAPI.db.getProfile()
      }
      return null
    },
    saveProfile: async (data: unknown) => {
      if (typeof window !== 'undefined' && window.electronAPI?.db?.saveProfile) {
        return window.electronAPI.db.saveProfile(data)
      }
    },
    getHistory: async (): Promise<unknown[]> => {
      if (typeof window !== 'undefined' && window.electronAPI?.db?.getHistory) {
        return window.electronAPI.db.getHistory()
      }
      return []
    },
    saveHistory: async (entry: unknown) => {
      if (typeof window !== 'undefined' && window.electronAPI?.db?.saveHistory) {
        return window.electronAPI.db.saveHistory(entry)
      }
    },
    getQnaMemory: async (questionHash: string): Promise<string | null> => {
      if (typeof window !== 'undefined' && window.electronAPI?.db?.getQnaMemory) {
        return window.electronAPI.db.getQnaMemory(questionHash)
      }
      return null
    },
    saveQnaMemory: async (questionHash: string, question: string, answer: string, appId: number) => {
      if (typeof window !== 'undefined' && window.electronAPI?.db?.saveQnaMemory) {
        return window.electronAPI.db.saveQnaMemory(questionHash, question, answer, appId)
      }
    },
  },
  app: {
    getPlatform: (): string => {
      if (typeof window !== 'undefined' && window.electronAPI?.app?.getPlatform) {
        return window.electronAPI.app.getPlatform()
      }
      return typeof navigator !== 'undefined' ? navigator.platform : 'unknown'
    },
    isPackaged: (): boolean => {
      if (typeof window !== 'undefined' && window.electronAPI?.app?.isPackaged) {
        return window.electronAPI.app.isPackaged()
      }
      return false
    },
  },
}