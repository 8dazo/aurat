"use client"

import { useState } from "react"
import { useAgentWs, type AgentStatus } from "@/lib/use-agent-ws"
import { electronAPI } from "@/lib/electron-api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Monitor, Pause, Play } from "lucide-react"

const statusLabel: Record<AgentStatus, string> = {
  Idle: "Ready",
  Running: "Agent Working",
  Paused: "Paused — You Have Control",
}

const statusDescription: Record<AgentStatus, string> = {
  Idle: "Start an application to begin. A browser window will open automatically when the agent starts.",
  Running: "The agent is filling in the form. Avoid interacting with the browser window — your clicks may conflict with the agent.",
  Paused: "The agent is paused. You can interact with the browser window directly. Take your time, then give control back when ready.",
}

const statusVariant: Record<AgentStatus, "default" | "secondary" | "destructive"> = {
  Idle: "secondary",
  Running: "default",
  Paused: "destructive",
}

export function BrowserStatus() {
  const [status, setStatus] = useState<AgentStatus>("Idle")
  const [pauseReason, setPauseReason] = useState<string | null>(null)

  useAgentWs({
    onStatus: (s, reason) => {
      setStatus(s)
      setPauseReason(reason)
    },
  })

  const handlePause = async () => {
    try {
      await electronAPI.python.request("/pause")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pause")
    }
  }

  const handleResume = async () => {
    try {
      await electronAPI.python.request("/resume")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resume")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 bg-muted/30">
      <div className="text-center space-y-3 max-w-md">
        <Monitor className="h-12 w-12 mx-auto text-muted-foreground" />
        <Badge variant={statusVariant[status]} className="text-sm px-3 py-1">
          {statusLabel[status]}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {statusDescription[status]}
        </p>
        {status === "Running" && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-600 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span><strong>Warning:</strong> Avoid clicking the browser window while the agent is working.</span>
          </div>
        )}
        {status === "Paused" && pauseReason && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-600">
            {pauseReason}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handlePause}
          disabled={status !== "Running"}
          variant="outline"
        >
          <Pause className="h-4 w-4 mr-2" />
          Take Control
        </Button>
        <Button
          onClick={handleResume}
          disabled={status !== "Paused"}
        >
          <Play className="h-4 w-4 mr-2" />
          Give Control Back
        </Button>
      </div>
    </div>
  )
}