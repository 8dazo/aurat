"use client"

import { useEffect, useRef, useState, useCallback } from "react"

const WS_URL = "ws://localhost:18732"
const RECONNECT_DELAY = 2000

export type AgentStatus = "Idle" | "Running" | "Paused"

interface UseAgentWsOptions {
  onStatus?: (status: AgentStatus, pauseReason: string | null) => void
  onLog?: (message: string) => void
}

export function useAgentWs({ onStatus, onLog }: UseAgentWsOptions) {
  const onStatusRef = useRef(onStatus)
  const onLogRef = useRef(onLog)
  onStatusRef.current = onStatus
  onLogRef.current = onLog

  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    function connect() {
      if (cancelled) return
      ws = new WebSocket(`${WS_URL}/ws/logs`)

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
          }
        } catch { /* ignore non-JSON */ }
      }

      ws.onclose = () => {
        setConnected(false)
        ws = null
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY)
        }
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [])

  return { connected }
}