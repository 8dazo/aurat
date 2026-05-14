"use client"

import { useEffect, useState, useCallback } from "react"
import { useAgentWs } from "@/lib/use-agent-ws"
import { type AgentStatus } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Monitor } from "lucide-react"

export function BrowserPreview() {
  const [status, setStatus] = useState<AgentStatus>("Idle")
  const [pauseReason, setPauseReason] = useState<string | null>(null)

  const handleStatus = useCallback((s: AgentStatus, reason: string | null) => {
    setStatus(s)
    setPauseReason(reason)
  }, [])

  const { connected } = useAgentWs({
    onStatus: handleStatus,
  })

  useEffect(() => {
    return () => {}
  }, [])

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {!connected && status !== "Idle" && (
        <div className="bg-yellow-500/10 text-yellow-600 text-xs px-3 py-1.5 border-b border-yellow-500/20">
          Lost connection to backend — reconnecting...
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        {status === "Idle" && (
          <div className="text-center space-y-3 max-w-md">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground" />
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Ready
            </Badge>
            <p className="text-sm text-muted-foreground">
              Start an application to begin. The browser will open automatically so you can watch the agent work.
            </p>
          </div>
        )}

        {status === "Running" && (
          <div className="text-center space-y-4 max-w-md">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto" />
            <Badge variant="default" className="text-sm px-3 py-1">
              Agent Working
            </Badge>
            <p className="text-sm text-muted-foreground">
              The agent is running in a separate browser window. Watch it there to see live progress.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span>Live view is in the CloakBrowser window</span>
            </div>
          </div>
        )}

        {status === "Paused" && (
          <div className="text-center space-y-4 max-w-md">
            <Badge variant="destructive" className="text-sm px-3 py-1">
              Paused
            </Badge>
            {pauseReason && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-600">
                {pauseReason}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              The agent is paused. Check the CloakBrowser window to see the current state.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}