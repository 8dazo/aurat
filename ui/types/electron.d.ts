export {}

declare global {
  interface Window {
    electronAPI?: {
      python: {
        request: (endpoint: string, body?: unknown) => Promise<unknown>
      }
      db: {
        getProfile: () => Promise<unknown>
        saveProfile: (data: unknown) => Promise<void>
        getHistory: () => Promise<unknown[]>
      }
    }
  }
}