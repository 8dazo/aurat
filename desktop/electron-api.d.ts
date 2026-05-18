export interface ElectronAPI {
  python: {
    request(endpoint: string, body?: unknown, timeoutMs?: number): Promise<unknown>
    onLog(callback: (log: string) => void): () => void
  }
  db: {
    getProfile(): Promise<unknown>
    saveProfile(data: unknown): Promise<void>
    getHistory(filters?: unknown): Promise<unknown[]>
    saveHistory(entry: unknown): Promise<void>
    getQnaMemory(questionHash: string): Promise<string | null>
    saveQnaMemory(questionHash: string, question: string, answer: string, appId: number): Promise<void>
  }
  app: {
    getPlatform(): string
    isPackaged(): boolean
  }
  browser: {
    getCdpPort(): Promise<number>
    attachExternal(pid: number, cdpUrl: string): Promise<{ status: string; error?: string; cdp_url?: string }>
    detachExternal(): Promise<{ status: string }>
    getExternalStatus(): Promise<{ attached: boolean; cdpUrl: string | null; pid: number | null }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}