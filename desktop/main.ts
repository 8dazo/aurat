import { app, BrowserWindow, WebContentsView, ipcMain } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as http from 'http'
import dotenv from 'dotenv'
import { registerIpcHandlers } from './ipc-handlers'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

let mainWindow: BrowserWindow | null = null
let pyProc: ChildProcess | null = null
let browserView: WebContentsView | null = null
let infoServer: http.Server | null = null

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

function startInfoServer() {
  infoServer = http.createServer(async (req, res) => {
    if (req.url === '/cdp-info') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ cdp_port: cdpPort }))
    } else if (req.url === '/attach-agent-view') {
      // Called by Python backend before connecting via CDP.
      // Creates the WebContentsView so it appears as a page target in CDP.
      try {
        await attachBrowserView('about:blank')
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok' }))
      } catch (e: unknown) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'error', error: String(e) }))
      }
    } else if (req.url === '/detach-agent-view') {
      detachBrowserView()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok' }))
    } else {
      res.writeHead(404)
      res.end()
    }
  })
  infoServer.listen(18733, '127.0.0.1')
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
  if (mainWindow) {
    try {
      mainWindow.contentView.removeChildView(browserView)
    } catch {}
  }
  browserView = null
}

async function attachBrowserView(url: string): Promise<{ status: string; error?: string }> {
  if (!mainWindow) {
    return { status: 'error', error: 'No main window' }
  }

  detachBrowserView()

  browserView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const bv = browserView
  bv.webContents.loadURL(url)

  mainWindow.contentView.addChildView(bv)
  resizeBrowserView()

  return new Promise((resolve) => {
    let settled = false

    const onDone = (result: { status: string; error?: string }) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    bv.webContents.on('did-finish-load', () => {
      if (browserView !== bv) {
        onDone({ status: 'error', error: 'Browser view was replaced' })
        return
      }
      onDone({ status: 'attached' })
    })

    bv.webContents.on('render-process-gone', () => {
      if (browserView === bv) {
        detachBrowserView()
      }
      onDone({ status: 'error', error: 'Render process gone' })
    })

    setTimeout(() => {
      if (!settled) {
        onDone({ status: 'attached' })
      }
    }, 10000)
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

// Set CDP port BEFORE app.whenReady() — Chromium reads this at startup.
// Use a fixed port in the dynamic range; if it's taken, Chromium will find another.
const CDP_PORT = 9222
app.commandLine.appendSwitch('remote-debugging-port', String(CDP_PORT))
let cdpPort: number = CDP_PORT

app.whenReady().then(async () => {
  registerIpcHandlers()

  ipcMain.handle('browser:getCdpPort', () => cdpPort)

  ipcMain.handle('browser:attach', async (_event, url: string) => {
    return await attachBrowserView(url)
  })

  ipcMain.handle('browser:detach', async () => {
    detachBrowserView()
    return { status: 'detached' }
  })

  startPythonBackend(cdpPort)
  startInfoServer()
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
  if (infoServer) {
    infoServer.close()
    infoServer = null
  }
  if (pyProc) {
    pyProc.kill()
    pyProc = null
  }
})