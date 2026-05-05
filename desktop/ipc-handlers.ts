import { ipcMain, app } from 'electron'
import http from 'http'

const PYTHON_PORT = 18732

async function pythonRequest(endpoint: string, body?: unknown, timeoutMs = 30000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${PYTHON_PORT}${endpoint}`
    const payload = body ? JSON.stringify(body) : null
    const options: http.RequestOptions = {
      method: payload ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: timeoutMs,
    }
    const req = http.request(url, options, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => (data += chunk))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve(data) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')) })
    if (payload) req.write(payload)
    req.end()
  })
}

export function registerIpcHandlers() {
  ipcMain.handle('python:request', async (_event, { endpoint, body }) => {
    return pythonRequest(endpoint, body)
  })

  ipcMain.on('python:input', async (_event, inputEvent: Record<string, unknown>) => {
    try {
      await pythonRequest('/send_input', inputEvent)
    } catch (err) {
      console.error('[python:input] Failed to forward input:', err)
    }
  })

  ipcMain.on('app:isPackaged', (event) => {
    event.returnValue = app.isPackaged
  })

  ipcMain.handle('db:getProfile', async () => {
    try {
      return await pythonRequest('/db/profile')
    } catch {
      return null
    }
  })

  ipcMain.handle('db:saveProfile', async (_event, data) => {
    try {
      return await pythonRequest('/db/profile', data)
    } catch {
      return null
    }
  })

  ipcMain.handle('db:getHistory', async (_event, filters) => {
    try {
      const params = filters ? `?filters=${encodeURIComponent(JSON.stringify(filters))}` : ''
      return await pythonRequest(`/db/history${params}`)
    } catch {
      return []
    }
  })

  ipcMain.handle('db:saveHistory', async (_event, entry) => {
    try {
      return await pythonRequest('/db/history', entry)
    } catch {
      return null
    }
  })

  ipcMain.handle('db:getQnaMemory', async (_event, questionHash) => {
    try {
      return await pythonRequest(`/db/qna/${questionHash}`)
    } catch {
      return null
    }
  })

  ipcMain.handle('db:saveQnaMemory', async (_event, params) => {
    try {
      return await pythonRequest('/db/qna', params)
    } catch {
      return null
    }
  })
}