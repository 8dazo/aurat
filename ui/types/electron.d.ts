export {}

declare global {
  interface Window {
    electronAPI?: {
      python: {
        request: (endpoint: string, body?: unknown, timeoutMs?: number) => Promise<unknown>
        onScreencastFrame: (callback: (frame: string) => void) => () => void
        onLog: (callback: (log: string) => void) => () => void
        sendInput: (event: unknown) => void
      }
      db: {
        getProfile: () => Promise<unknown>
        saveProfile: (data: unknown) => Promise<void>
        getHistory: (filters?: unknown) => Promise<unknown[]>
        saveHistory: (entry: unknown) => Promise<void>
        getQnaMemory: (questionHash: string) => Promise<string | null>
        saveQnaMemory: (questionHash: string, question: string, answer: string, appId: number) => Promise<void>
      }
      app: {
        getPlatform: () => string
        isPackaged: () => boolean
      }
    }
  }
}