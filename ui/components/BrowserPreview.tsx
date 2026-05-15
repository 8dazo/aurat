"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useAgentWs } from "@/lib/use-agent-ws"
import { type AgentStatus } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Monitor, Loader2 } from "lucide-react"

function mapMouseButton(button: number): string {
  if (button === 0) return "left"
  if (button === 1) return "middle"
  if (button === 2) return "right"
  return "left"
}

function mapModifiers(altKey: boolean, ctrlKey: boolean, metaKey: boolean, shiftKey: boolean): number {
  let mods = 0
  if (altKey) mods |= 1
  if (ctrlKey) mods |= 2
  if (metaKey) mods |= 4
  if (shiftKey) mods |= 8
  return mods
}

export function BrowserPreview() {
  const [status, setStatus] = useState<AgentStatus>("Idle")
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef({ width: 1280, height: 900 })
  const latestImgRef = useRef<HTMLImageElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingDrawRef = useRef(false)

  const handleStatus = useCallback((s: AgentStatus, reason: string | null) => {
    setStatus(s)
    setPauseReason(reason)
  }, [])

  const handleLog = useCallback((message: string) => {
    const match = message.match(/page_url=(.+)/)
    if (match) {
      setCurrentUrl(match[1])
    }
  }, [])

  const handleScreencastFrame = useCallback((data: string, _frameNumber: number) => {
    const img = new Image()
    img.onload = () => {
      latestImgRef.current = img
      if (!pendingDrawRef.current) {
        pendingDrawRef.current = true
        rafRef.current = requestAnimationFrame(() => {
          pendingDrawRef.current = false
          const canvas = canvasRef.current
          if (!canvas) return
          const ctx = canvas.getContext("2d")
          if (!ctx) return
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
        })
      }
    }
    img.src = `data:image/jpeg;base64,${data}`
  }, [])

  const handleViewportSize = useCallback((width: number, height: number) => {
    viewportRef.current = { width, height }
  }, [])

  const { connected, sendInput } = useAgentWs({
    onStatus: handleStatus,
    onLog: handleLog,
    onScreencastFrame: handleScreencastFrame,
    onViewportSize: handleViewportSize,
  })

  const getScale = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return { scaleX: 1, scaleY: 1 }
    const vp = viewportRef.current
    return {
      scaleX: vp.width / canvas.clientWidth,
      scaleY: vp.height / canvas.clientHeight,
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { scaleX, scaleY } = getScale()
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    sendInput({
      input_type: "mouse",
      type: e.type === "dblclick" ? "mousePressed" : "mousePressed",
      x,
      y,
      button: mapMouseButton(e.button),
      click_count: e.detail,
      modifiers: mapModifiers(e.altKey, e.ctrlKey, e.metaKey, e.shiftKey),
    })
    if (e.type === "dblclick") {
      sendInput({
        input_type: "mouse",
        type: "mouseReleased",
        x,
        y,
        button: mapMouseButton(e.button),
        click_count: 2,
        modifiers: mapModifiers(e.altKey, e.ctrlKey, e.metaKey, e.shiftKey),
      })
    }
    canvas.focus()
  }, [getScale, sendInput])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { scaleX, scaleY } = getScale()
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    sendInput({
      input_type: "mouse",
      type: "mouseReleased",
      x,
      y,
      button: mapMouseButton(e.button),
      click_count: 1,
      modifiers: mapModifiers(e.altKey, e.ctrlKey, e.metaKey, e.shiftKey),
    })
  }, [getScale, sendInput])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { scaleX, scaleY } = getScale()
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    sendInput({
      input_type: "mouse",
      type: "mouseMoved",
      x,
      y,
      button: "none",
      modifiers: mapModifiers(e.altKey, e.ctrlKey, e.metaKey, e.shiftKey),
    })
  }, [getScale, sendInput])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { scaleX, scaleY } = getScale()
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    sendInput({
      input_type: "mouse",
      type: "wheel",
      x,
      y,
      delta_x: e.deltaX,
      delta_y: e.deltaY,
      modifiers: mapModifiers(e.altKey, e.ctrlKey, e.metaKey, e.shiftKey),
    })
  }, [getScale, sendInput])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    sendInput({
      input_type: "key",
      type: "keyDown",
      key: e.key,
      code: e.code,
      modifiers: mapModifiers(e.altKey, e.ctrlKey, e.metaKey, e.shiftKey),
    })
  }, [sendInput])

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    sendInput({
      input_type: "key",
      type: "keyUp",
      key: e.key,
      code: e.code,
      modifiers: mapModifiers(e.altKey, e.ctrlKey, e.metaKey, e.shiftKey),
    })
  }, [sendInput])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  const isActive = status === "Running" || status === "Paused"

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-black select-none" onContextMenu={handleContextMenu}>
      {!connected && status !== "Idle" && (
        <div className="bg-yellow-500/10 text-yellow-600 text-xs px-3 py-1.5 border-b border-yellow-500/20">
          Lost connection — reconnecting...
        </div>
      )}

      {status === "Idle" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="text-center space-y-3 max-w-md">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground" />
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Ready
            </Badge>
            <p className="text-sm text-muted-foreground">
              Start an application to begin. The browser preview will appear here.
            </p>
          </div>
        </div>
      )}

      {status === "Running" && !currentUrl && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="text-center space-y-3 max-w-md">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Starting stealth browser...</p>
          </div>
        </div>
      )}

      {isActive && currentUrl && (
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <canvas
            ref={canvasRef}
            tabIndex={0}
            className="w-full h-full object-contain outline-none cursor-default"
            style={{ imageRendering: "auto" }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onDoubleClick={handleMouseDown}
          />
          <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/70 rounded-md px-2 py-1 pointer-events-none">
            {status === "Running" && <Loader2 className="h-3 w-3 animate-spin text-green-400" />}
            {status === "Paused" && <div className="h-3 w-3 rounded-sm bg-orange-400" />}
            <Badge
              variant={status === "Running" ? "default" : "destructive"}
              className="text-xs pointer-events-none"
            >
              {status === "Running" ? "Agent Working" : "Paused"}
            </Badge>
          </div>
          {currentUrl && (
            <div className="absolute bottom-2 left-2 right-2 bg-black/70 rounded-md px-2 py-1 pointer-events-none">
              <p className="text-xs text-gray-300 truncate" title={currentUrl}>
                {currentUrl}
              </p>
            </div>
          )}
          {status === "Paused" && pauseReason && (
            <div className="absolute top-10 left-2 right-2 rounded-md border border-orange-500/30 bg-orange-500/10 p-2 text-sm text-orange-600 pointer-events-none">
              {pauseReason}
            </div>
          )}
        </div>
      )}
    </div>
  )
}