import { app, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import { registerIpcHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null
let pyProc: ChildProcess | null = null

function startPythonBackend() {
  if (app.isPackaged) {
    const exePath = path.join(process.resourcesPath, 'engine', 'aurat-engine')
    pyProc = spawn(exePath, [], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })
  } else {
    const uvicornPath = path.join(__dirname, '..', 'engine', '.venv', 'bin', 'uvicorn')
    const engineDir = path.join(__dirname, '..', 'engine')
    pyProc = spawn(uvicornPath, ['main:app', '--port', '18732'], {
      cwd: engineDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })
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
    backgroundColor: '#111111',
  })

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../ui/out/index.html'))
  } else {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(async () => {
  registerIpcHandlers()
  startPythonBackend()
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