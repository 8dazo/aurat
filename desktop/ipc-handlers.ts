import { ipcMain, app } from 'electron'
import http from 'http'

const PYTHON_PORT = 18732

async function pythonRequest(endpoint: string, body?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${PYTHON_PORT}${endpoint}`
    const payload = body ? JSON.stringify(body) : null
    const options: http.RequestOptions = {
      method: payload ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
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
    if (payload) req.write(payload)
    req.end()
  })
}

export function registerIpcHandlers() {
  ipcMain.handle('python:request', async (_event, { endpoint, body }) => {
    return pythonRequest(endpoint, body)
  })

  ipcMain.on('app:isPackaged', (event) => {
    event.returnValue = app.isPackaged
  })

  ipcMain.handle('db:getProfile', async () => {
    return null
  })

  ipcMain.handle('db:saveProfile', async (_event, _data) => {
    return null
  })

  ipcMain.handle('db:getHistory', async (_event, _filters) => {
    return []
  })

  ipcMain.handle('db:saveHistory', async (_event, _entry) => {
    return null
  })

  ipcMain.handle('db:getQnaMemory', async (_event, _questionHash) => {
    return null
  })

  ipcMain.handle('db:saveQnaMemory', async (_event, _params) => {
    return null
  })
}