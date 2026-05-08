import { ipcMain, app } from 'electron'
import http from 'http'

const PYTHON_PORT = 18732

async function pythonRequest(endpoint: string, body?: unknown, timeoutMs = 30000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const isGet = !endpoint.startsWith('/analyze') &&
                  !endpoint.startsWith('/apply') &&
                  !endpoint.startsWith('/extract') &&
                  !endpoint.startsWith('/send_input') &&
                  !endpoint.startsWith('/install') &&
                  endpoint !== '/db/profile'
    let url: string
    let payload: string | null = null
    const options: http.RequestOptions = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: timeoutMs,
    }

    if (isGet && body && typeof body === 'object') {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(body as Record<string, string>)) {
        if (v !== undefined && v !== null) params.set(k, v)
      }
      url = `http://localhost:${PYTHON_PORT}${endpoint}?${params.toString()}`
    } else if (body) {
      url = `http://localhost:${PYTHON_PORT}${endpoint}`
      payload = JSON.stringify(body)
      options.method = 'POST'
    } else {
      url = `http://localhost:${PYTHON_PORT}${endpoint}`
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
  ipcMain.handle('python:request', async (_event, { endpoint, body, timeoutMs }) => {
    return pythonRequest(endpoint, body, timeoutMs ?? 30000)
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