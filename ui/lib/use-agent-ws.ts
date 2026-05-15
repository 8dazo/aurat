"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { WS_URL, type AgentStatus } from "@/lib/constants"

const RECONNECT_DELAY = 2000

export type { AgentStatus }

interface UseAgentWsOptions {
  onStatus?: (status: AgentStatus, pauseReason: string | null) => void
  onLog?: (message: string) => void
  onScreencastFrame?: (data: string, frameNumber: number) => void
  onViewportSize?: (width: number, height: number) => void
}

export function useAgentWs({ onStatus, onLog, onScreencastFrame, onViewportSize }: UseAgentWsOptions) {
  const onStatusRef = useRef(onStatus)
  const onLogRef = useRef(onLog)
  const onFrameRef = useRef(onScreencastFrame)
  const onViewportSizeRef = useRef(onViewportSize)
  onStatusRef.current = onStatus
  onLogRef.current = onLog
  onFrameRef.current = onScreencastFrame
  onViewportSizeRef.current = onViewportSize

  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    function connect() {
      if (cancelled) return
      const ws = new WebSocket(`${WS_URL}/ws/logs`)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "status" && onStatusRef.current) {
            onStatusRef.current(data.status ?? "Idle", data.pause_reason ?? null)
          } else if (data.type === "log" && onLogRef.current) {
            onLogRef.current(data.message)
          } else if (data.type === "screencast_frame" && onFrameRef.current) {
            onFrameRef.current(data.data, data.frame_number ?? 0)
          } else if (data.type === "viewport_size" && onViewportSizeRef.current) {
            onViewportSizeRef.current(data.width ?? 1280, data.height ?? 900)
          }
        } catch { /* ignore non-JSON */ }
      }

      ws.onclose = () => {
        setConnected(false)
        wsRef.current = null
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [])

  const sendInput = useCallback((event: Record<string, unknown>) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "input", ...event }))
    }
  }, [])

  return { connected, sendInput }
}