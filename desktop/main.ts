import { app, BrowserWindow, ipcMain } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import dotenv from 'dotenv'
import { registerIpcHandlers } from './ipc-handlers'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

let mainWindow: BrowserWindow | null = null
let pyProc: ChildProcess | null = null

// The CDP port where the stealth Chrome exposes DevTools Protocol.
// browser-use connects to this port. The frontend receives screencast
// frames via the WebSocket log stream.
const AGENT_CDP_PORT = 9222

function startPythonBackend(cdpPortNum: number) {
  const env = { ...process.env, PYTHONUNBUFFERED: '1', ELECTRON_CDP_PORT: String(cdpPortNum) }
  if (app.isPackaged) {
    const exePath = path.join(process.resourcesPath, 'python-bin', 'aurat-engine', 'aurat-engine')
    pyProc = spawn(exePath, [], { env })
  } else {
    const uvicornPath = path.join(__dirname, '..', '..', 'engine', '.venv', 'bin', 'uvicorn')
    const engineDir = path.join(__dirname, '..', '..', 'engine')
    pyProc = spawn(uvicornPath, ['main:app', '--port', '18732'], { cwd: engineDir, env })
  }

  pyProc.stdout?.on('data', (data: Buffer) => {
    console.log(`[python:stdout] ${data.toString()}`)
  })
  pyProc.stderr?.on('data', (data: Buffer) => {
    console.error(`[python:stderr] ${data.toString()}`)
  })
  pyProc.on('error', (err) => {
    console.error('[python:error]', err)
  })
}

async function waitForPython(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    try {
      const resp = await fetch('http://localhost:18732/health')
      if (resp.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  console.error('[python] backend did not become ready in time')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Aurat AI',
    backgroundColor: '#ffffff',
  })

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'ui', 'out', 'index.html'))
  } else {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(async () => {
  registerIpcHandlers()

  ipcMain.handle('browser:getCdpPort', () => AGENT_CDP_PORT)

  startPythonBackend(AGENT_CDP_PORT)
  await waitForPython()
  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', () => {
  if (pyProc) {
    pyProc.kill()
    pyProc = null
  }
})