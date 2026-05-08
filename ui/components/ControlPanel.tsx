"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useAgentWs, type AgentStatus } from "@/lib/use-agent-ws"
import { electronAPI } from "@/lib/electron-api"
import { toast } from "sonner"
import type { MasterProfile } from "@/types"

const statusVariant: Record<AgentStatus, "default" | "secondary" | "destructive"> = {
  Idle: "secondary",
  Running: "default",
  Paused: "destructive",
}

interface ControlPanelProps {
  jobUrl?: string
  jobTitle?: string
  jobCompany?: string
  atsType?: string
  profile?: MasterProfile | null
}

export function ControlPanel({ jobUrl = "", jobTitle = "", jobCompany = "", atsType = "greenhouse", profile = null }: ControlPanelProps) {
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

  const { connected } = useAgentWs({
    onStatus: handleStatus,
    onLog: handleLog,
  })

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [stepLogs])

  const handleStart = useCallback(async () => {
    if (!jobUrl) {
      toast.error("No job URL provided. Go to Jobs and select a job to apply.")
      return
    }
    if (!profile) {
      toast.error("No profile loaded. Upload your resume first.")
      return
    }
    setLoading(true)
    setStatus("Running")
    try {
      await electronAPI.python.request("/apply", {
        job_url: jobUrl,
        job_title: jobTitle,
        job_company: jobCompany,
        ats_type: atsType,
        profile: profile,
      })
    } catch (err) {
      setStatus("Idle")
      toast.error(err instanceof Error ? err.message : "Failed to start application")
    } finally {
      setLoading(false)
    }
  }, [jobUrl, jobTitle, jobCompany, atsType, profile])

  const handlePause = useCallback(async () => {
    setLoading(true)
    try {
      await electronAPI.python.request("/pause")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pause")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleResume = useCallback(async () => {
    setLoading(true)
    try {
      await electronAPI.python.request("/resume")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resume")
    } finally {
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
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-400 animate-pulse'}`} />
          {connected ? 'Connected' : 'Connecting...'}
        </div>
      </div>

      {jobUrl && (
        <div className="px-4 pb-3 space-y-1">
          <p className="text-sm font-medium truncate">{jobTitle || "Untitled Job"}</p>
          <p className="text-xs text-muted-foreground truncate">{jobCompany}</p>
        </div>
      )}

      <Separator />

      <div className="flex gap-2 p-4">
        <Button size="sm" onClick={handleStart} disabled={loading || status === "Running"}>
          Start
        </Button>
        <Button size="sm" variant="outline" onClick={handlePause} disabled={loading || status !== "Running"}>
          Take Control
        </Button>
        <Button size="sm" variant="outline" onClick={handleResume} disabled={loading || status !== "Paused"}>
          Give Control Back
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