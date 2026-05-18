import { app, BrowserWindow, ipcMain } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import * as http from 'http'
import * as path from 'path'
import dotenv from 'dotenv'
import { registerIpcHandlers } from './ipc-handlers'
import {
  checkAccessibilityPermission,
  requestAccessibilityPermission,
  findWindowByPID,
  setPositionAndSize,
  raiseWindow,
  dispose as disposeCloakWindow,
  AXWindowRef,
  TITLE_BAR_HEIGHT_PT,
  OFFSCREEN_X,
  PANEL_WIDTH,
  kAXErrorAPIDisabled,
  kAXErrorCannotComplete,
  kAXErrorInvalidUIElement,
} from './cloak-window'

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const AGENT_CDP_PORT = 9222

app.commandLine.appendSwitch('remote-debugging-port', String(AGENT_CDP_PORT))

let mainWindow: BrowserWindow | null = null
let pyProc: ChildProcess | null = null
let infoServer: http.Server | null = null
let cloakWindow: AXWindowRef | null = null
let cloakPID: number | null = null
let cloakCDPUrl: string | null = null
let lastActivePosition: { x: number; y: number; w: number; h: number } | null = null

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

function computeExternalFrame(): { x: number; y: number; w: number; h: number } {
  if (!mainWindow) return { x: 0, y: 0, w: 400, h: 700 }
  const bounds = mainWindow.getBounds()
  const contentBounds = mainWindow.getContentBounds()
  const x = bounds.x
  const y = bounds.y
  const w = Math.max(contentBounds.width - PANEL_WIDTH, 400)
  const h = contentBounds.height + TITLE_BAR_HEIGHT_PT
  return { x, y, w, h }
}

function onElectronWindowChange() {
  if (!cloakWindow || !mainWindow) return
  const frame = computeExternalFrame()
  setPositionAndSize(cloakWindow, frame.x, frame.y, frame.w, frame.h)
  lastActivePosition = frame
}

function onElectronFocus() {
  if (!cloakWindow || !lastActivePosition) return
  setPositionAndSize(cloakWindow, lastActivePosition.x, lastActivePosition.y, lastActivePosition.w, lastActivePosition.h)
  raiseWindow(cloakWindow)
}

function onElectronBlur() {
  if (!cloakWindow || !lastActivePosition) return
  setPositionAndSize(cloakWindow, OFFSCREEN_X, lastActivePosition.y, lastActivePosition.w, lastActivePosition.h)
}

async function attachExternalView(pid: number, cdpUrl: string): Promise<{ status: string; error?: string; cdp_url?: string }> {
  if (!mainWindow) {
    return { status: 'error', error: 'No main window' }
  }

  if (!checkAccessibilityPermission()) {
    requestAccessibilityPermission()
    return { status: 'error', error: 'Accessibility permission required. Grant it in System Preferences > Privacy & Security > Accessibility and retry.' }
  }

  const windowRef = await findWindowByPID(pid, 10)
  if (!windowRef) {
    return { status: 'error', error: `Could not find window for PID ${pid}` }
  }

  detachExternalView()

  cloakWindow = windowRef
  cloakPID = pid
  cloakCDPUrl = cdpUrl

  const frame = computeExternalFrame()
  setPositionAndSize(cloakWindow, frame.x, frame.y, frame.w, frame.h)
  lastActivePosition = frame
  raiseWindow(cloakWindow)

  mainWindow.on('move', onElectronWindowChange)
  mainWindow.on('resize', onElectronWindowChange)
  mainWindow.on('focus', onElectronFocus)
  mainWindow.on('blur', onElectronBlur)

  return { status: 'attached', cdp_url: cdpUrl }
}

function detachExternalView(): { status: string } {
  if (!mainWindow) {
    return { status: 'ok' }
  }

  mainWindow.removeListener('move', onElectronWindowChange)
  mainWindow.removeListener('resize', onElectronWindowChange)
  mainWindow.removeListener('focus', onElectronFocus)
  mainWindow.removeListener('blur', onElectronBlur)

  if (cloakWindow) {
    if (lastActivePosition) {
      setPositionAndSize(cloakWindow, OFFSCREEN_X, lastActivePosition.y, lastActivePosition.w, lastActivePosition.h)
    }
    disposeCloakWindow()
  }

  cloakWindow = null
  cloakPID = null
  cloakCDPUrl = null
  lastActivePosition = null

  return { status: 'ok' }
}

function startInfoServer() {
  infoServer = http.createServer((req, res) => {
    if (req.url === '/cdp-info') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ cdp_port: AGENT_CDP_PORT }))
    } else if (req.url === '/attach-external-view') {
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body)
          const pid = parsed.pid
          const cdpUrl = parsed.cdp_url
          if (!pid || !cdpUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ status: 'error', error: 'Missing pid or cdp_url' }))
            return
          }
          const result = await attachExternalView(pid, cdpUrl)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(result))
        } catch (e: unknown) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ status: 'error', error: String(e) }))
        }
      })
    } else if (req.url === '/detach-external-view') {
      const result = detachExternalView()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    } else if (req.url === '/view-status') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ attached: cloakWindow !== null, cdp_url: cloakCDPUrl, pid: cloakPID }))
    } else if (req.url === '/ax-check') {
      const trusted = checkAccessibilityPermission()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ax_trusted: trusted }))
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

app.whenReady().then(async () => {
  registerIpcHandlers()

  ipcMain.handle('browser:getCdpPort', () => AGENT_CDP_PORT)

  ipcMain.handle('browser:attachExternal', async (_event, { pid, cdpUrl }: { pid: number; cdpUrl: string }) => {
    return await attachExternalView(pid, cdpUrl)
  })

  ipcMain.handle('browser:detachExternal', () => {
    return detachExternalView()
  })

  ipcMain.handle('browser:getExternalStatus', () => {
    return { attached: cloakWindow !== null, cdpUrl: cloakCDPUrl, pid: cloakPID }
  })

  startPythonBackend(AGENT_CDP_PORT)
  startInfoServer()
  await waitForPython()
  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', () => {
  if (cloakPID) {
    try {
      process.kill(cloakPID, 'SIGKILL')
    } catch {}
  }
  detachExternalView()
  if (pyProc) {
    pyProc.kill()
    pyProc = null
  }
  if (infoServer) {
    infoServer.close()
    infoServer = null
  }
})