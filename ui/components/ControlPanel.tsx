"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAgentWs, type AgentStatus } from "@/lib/use-agent-ws"
import { electronAPI } from "@/lib/electron-api"

const statusVariant: Record<AgentStatus, "default" | "secondary" | "destructive"> = {
  Idle: "secondary",
  Running: "default",
  Paused: "destructive",
}

export function ControlPanel() {
  const [status, setStatus] = useState<AgentStatus>("Idle")
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  const [stepLogs, setStepLogs] = useState<{ message: string; timestamp: number }[]>([])
  const [loading, setLoading] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  const handleStatus = useCallback((s: AgentStatus, reason: string | null) => {
    setStatus(s)
    setPauseReason(reason)
  }, [])

  const handleLog = useCallback((message: string) => {
    setStepLogs((prev) => [...prev.slice(-200), { message, timestamp: Date.now() }])
  }, [])

  useAgentWs({
    onStatus: handleStatus,
    onLog: handleLog,
  })

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [stepLogs])

  const handleStart = useCallback(async () => {
    setLoading(true)
    try {
      await electronAPI.python.request("/apply", {
        job_url: "",
        profile: {},
        ats_type: "greenhouse",
      })
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  const handlePause = useCallback(async () => {
    setLoading(true)
    try {
      await electronAPI.python.request("/pause")
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  const handleResume = useCallback(async () => {
    setLoading(true)
    try {
      await electronAPI.python.request("/resume")
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="flex h-full flex-col gap-0 bg-background">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Agent</span>
          <Badge variant={statusVariant[status]}>{status}</Badge>
        </div>
      </div>

      <Separator />

      <div className="flex gap-2 p-4">
        <Button size="sm" onClick={handleStart} disabled={loading || status === "Running"}>
          Start
        </Button>
        <Button size="sm" variant="outline" onClick={handlePause} disabled={loading || status !== "Running"}>
          Pause
        </Button>
        <Button size="sm" variant="outline" onClick={handleResume} disabled={loading || status !== "Paused"}>
          Resume
        </Button>
      </div>

      {status === "Paused" && pauseReason && (
        <div className="px-4 pb-2">
          <Card size="sm">
            <CardContent>
              <p className="text-xs text-destructive">{pauseReason}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      <Card className="m-0 flex-1 rounded-none border-0 border-t">
        <CardHeader className="px-4 py-2">
          <CardTitle className="text-xs">Step Log</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto p-0">
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto px-4 pb-2">
            {stepLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No logs yet</p>
            ) : (
              stepLogs.map((log, i) => (
                <div key={i} className="border-b border-border/50 py-1.5 text-xs">
                  <span className="mr-2 text-muted-foreground/50">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}