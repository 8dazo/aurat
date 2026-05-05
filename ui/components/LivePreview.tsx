"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useAgentWs } from "@/lib/use-agent-ws"
import { electronAPI } from "@/lib/electron-api"

const FRAME_WIDTH = 1280
const FRAME_HEIGHT = 800

export function LivePreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [frame, setFrame] = useState<string | null>(null)
  const [fps, setFps] = useState(0)
  const frameCountRef = useRef(0)
  const lastFpsTimeRef = useRef(Date.now())

  const handleFrame = useCallback((base64: string) => {
    setFrame(base64)
    frameCountRef.current++
  }, [])

  useAgentWs({
    onFrame: handleFrame,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - lastFpsTimeRef.current) / 1000
      if (elapsed > 0) {
        setFps(Math.round(frameCountRef.current / elapsed))
        frameCountRef.current = 0
        lastFpsTimeRef.current = now
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!frame || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
    }
    img.src = "data:image/png;base64," + frame
  }, [frame])

  const getScale = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return { sx: 1, sy: 1 }
    return {
      sx: FRAME_WIDTH / canvas.clientWidth,
      sy: FRAME_HEIGHT / canvas.clientHeight,
    }
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { sx, sy } = getScale()
      const rect = e.currentTarget.getBoundingClientRect()
      electronAPI.python.sendInput({
        type: "mousedown",
        x: Math.round((e.clientX - rect.left) * sx),
        y: Math.round((e.clientY - rect.top) * sy),
        button: e.button,
      })
    },
    [getScale]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { sx, sy } = getScale()
      const rect = e.currentTarget.getBoundingClientRect()
      electronAPI.python.sendInput({
        type: "mouseup",
        x: Math.round((e.clientX - rect.left) * sx),
        y: Math.round((e.clientY - rect.top) * sy),
        button: e.button,
      })
    },
    [getScale]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { sx, sy } = getScale()
      const rect = e.currentTarget.getBoundingClientRect()
      electronAPI.python.sendInput({
        type: "mousemove",
        x: Math.round((e.clientX - rect.left) * sx),
        y: Math.round((e.clientY - rect.top) * sy),
        button: 0,
      })
    },
    [getScale]
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault()
    electronAPI.python.request("send_input", { type: "keydown", key: e.key, code: e.code })
  }, [])

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault()
    electronAPI.python.request("send_input", { type: "keyup", key: e.key, code: e.code })
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center bg-black"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {frame ? (
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full cursor-default"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="text-center">
            <div className="mb-2 text-muted-foreground">No preview available</div>
            <div className="text-xs text-muted-foreground/50">Waiting for frames...</div>
          </div>
        </div>
      )}
      <div className="absolute top-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs text-muted-foreground">
        {fps} FPS
      </div>
    </div>
  )
}