const profileChangeListeners: (() => void)[] = []

export function onProfileChange(fn: () => void) {
  profileChangeListeners.push(fn)
  return () => {
    const i = profileChangeListeners.indexOf(fn)
    if (i >= 0) profileChangeListeners.splice(i, 1)
  }
}

export function notifyProfileChange() {
  profileChangeListeners.forEach((fn) => fn())
}

export const electronAPI = {
  python: {
    request: async (endpoint: string, body?: unknown, timeoutMs?: number): Promise<unknown> => {
      if (typeof window !== 'undefined' && window.electronAPI?.python?.request) {
        return window.electronAPI.python.request(endpoint, body, timeoutMs)
      }
      throw new Error('Running in browser - Electron IPC not available')
    },
    onLog: (callback: (log: string) => void): (() => void) => {
      if (typeof window !== 'undefined' && window.electronAPI?.python?.onLog) {
        return window.electronAPI.python.onLog(callback)
      }
      return () => {}
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
        const result = await window.electronAPI.db.saveProfile(data)
        notifyProfileChange()
        return result
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
  browser: {
    attach: async (cdpPort: number): Promise<{ status: string; error?: string }> => {
      if (typeof window !== 'undefined' && window.electronAPI?.browser?.attach) {
        return window.electronAPI.browser.attach(cdpPort)
      }
      return { status: 'unavailable' }
    },
    detach: async (): Promise<{ status: string }> => {
      if (typeof window !== 'undefined' && window.electronAPI?.browser?.detach) {
        return window.electronAPI.browser.detach()
      }
      return { status: 'unavailable' }
    },
  },
}