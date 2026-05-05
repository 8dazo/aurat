"use client"

import { useEffect, useRef, useCallback } from "react"

const WS_URL = "ws://localhost:18732"
const RECONNECT_DELAY = 2000

export type AgentStatus = "Idle" | "Running" | "Paused"

export interface AgentLog {
  message: string
  timestamp: number
}

interface UseAgentWsOptions {
  onFrame?: (base64: string) => void
  onStatus?: (status: AgentStatus, pauseReason: string | null) => void
  onLog?: (message: string) => void
}

export function useAgentWs({ onFrame, onStatus, onLog }: UseAgentWsOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_URL}/ws/screencast`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "frame" && data.frame && onFrame) {
          onFrame(data.frame)
        } else if (data.type === "status" && onStatus) {
          onStatus(data.status ?? "Idle", data.pause_reason ?? null)
        } else if (data.type === "log" && onLog) {
          onLog(data.message)
        }
      } catch {
        if (typeof event.data === "string" && onFrame) {
          onFrame(event.data)
        }
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [onFrame, onStatus, onLog])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  return wsRef
}