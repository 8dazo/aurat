"use client"

import React, { createContext, useContext, useEffect, useRef, useState } from "react"
import { WS_URL, type AgentStatus } from "@/lib/constants"

const RECONNECT_DELAY = 2000

export type { AgentStatus }

interface UseAgentWsOptions {
  onStatus?: (status: AgentStatus, pauseReason: string | null) => void
  onLog?: (message: string) => void
}

// 1. Standard Hook for Page-Specific Logs (like /apply or /history/[id])
export function useAgentWs({ onStatus, onLog }: UseAgentWsOptions) {
  const onStatusRef = useRef(onStatus)
  const onLogRef = useRef(onLog)
  onStatusRef.current = onStatus
  onLogRef.current = onLog

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
      wsRef.current = null
    }
  }, [])

  return { connected }
}

// 2. Global State Context for notification bars and background status
interface AgentStatusState {
  status: AgentStatus
  pauseReason: string | null
  connected: boolean
}

const AgentStatusContext = createContext<AgentStatusState>({
  status: "Idle",
  pauseReason: null,
  connected: false,
})

export function useAgentStatus() {
  return useContext(AgentStatusContext)
}

export function AgentStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AgentStatus>("Idle")
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false
    let ws: WebSocket | null = null

    function connect() {
      if (cancelled) return
      ws = new WebSocket(`${WS_URL}/ws/logs`)

      ws.onopen = () => {
        setConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "status") {
            setStatus(data.status ?? "Idle")
            setPauseReason(data.pause_reason ?? null)
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
      ws = null
    }
  }, [])

  return (
    <AgentStatusContext.Provider value={{ status, pauseReason, connected }}>
      {children}
    </AgentStatusContext.Provider>
  )
}