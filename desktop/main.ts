import { app, BrowserWindow, WebContentsView, ipcMain } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import dotenv from 'dotenv'
import { registerIpcHandlers } from './ipc-handlers'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

let mainWindow: BrowserWindow | null = null
let pyProc: ChildProcess | null = null
let browserView: WebContentsView | null = null

function startPythonBackend() {
  if (app.isPackaged) {
    const exePath = path.join(process.resourcesPath, 'python-bin', 'aurat-engine', 'aurat-engine')
    pyProc = spawn(exePath, [], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })
  } else {
    const uvicornPath = path.join(__dirname, '..', '..', 'engine', '.venv', 'bin', 'uvicorn')
    const engineDir = path.join(__dirname, '..', '..', 'engine')
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
    backgroundColor: '#ffffff',
  })

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'ui', 'out', 'index.html'))
  } else {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  }
}

function detachBrowserView() {
  if (!browserView) return
  try {
    browserView.webContents.executeJavaScript('window.__stopCDP()').catch(() => {})
  } catch {}
  if (mainWindow) {
    try {
      mainWindow.contentView.removeChildView(browserView)
    } catch {}
  }
  browserView = null
}

async function attachBrowserView(cdpPort: number): Promise<{ status: string; error?: string }> {
  if (!mainWindow) {
    return { status: 'error', error: 'No main window' }
  }

  detachBrowserView()

  let wsUrl: string | null = null
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const resp = await fetch(`http://127.0.0.1:${cdpPort}/json`)
      const targets = await resp.json() as any[]
      const pageTarget = targets.find((t: any) => t.type === 'page') || targets[0]
      if (pageTarget?.webSocketDebuggerUrl) {
        wsUrl = pageTarget.webSocketDebuggerUrl
        break
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  if (!wsUrl) {
    return { status: 'error', error: 'No CDP target found' }
  }

  browserView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  })

  const bv = browserView
  bv.webContents.loadFile(path.join(__dirname, 'browser-view.html'))

  return new Promise((resolve) => {
    bv.webContents.on('did-finish-load', () => {
      if (browserView !== bv) {
        resolve({ status: 'error', error: 'Browser view was replaced' })
        return
      }
      const safeUrl = wsUrl!.replace(/'/g, "\\'")
      bv.webContents.executeJavaScript(`window.__startCDP('${safeUrl}')`).then(() => {
        resolve({ status: 'attached' })
      }).catch((err: Error) => {
        resolve({ status: 'error', error: err.message })
      })
    })

    bv.webContents.on('render-process-gone', (_event, details) => {
      if (browserView === bv) {
        detachBrowserView()
      }
    })

    mainWindow!.contentView.addChildView(bv)
    resizeBrowserView()
  })
}

function resizeBrowserView() {
  if (!mainWindow || !browserView) return
  const bounds = mainWindow.getContentBounds()
  const controlPanelWidth = 400
  browserView.setBounds({
    x: 0,
    y: 0,
    width: bounds.width - controlPanelWidth,
    height: bounds.height,
  })
}

app.whenReady().then(async () => {
  registerIpcHandlers()

  ipcMain.handle('browser:attach', async (_event, cdpPort: number) => {
    return await attachBrowserView(cdpPort)
  })

  ipcMain.handle('browser:detach', async () => {
    detachBrowserView()
    return { status: 'detached' }
  })

  startPythonBackend()
  await waitForPython()
  createWindow()

  mainWindow!.on('resize', () => {
    resizeBrowserView()
  })
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