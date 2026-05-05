export const electronAPI = {
  python: {
    request: async (endpoint: string, body?: unknown): Promise<unknown> => {
      if (typeof window !== 'undefined' && window.electronAPI?.python?.request) {
        return window.electronAPI.python.request(endpoint, body)
      }
      throw new Error('Running in browser - Electron IPC not available')
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
  },
}