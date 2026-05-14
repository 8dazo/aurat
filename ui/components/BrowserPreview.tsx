"use client"

import { useEffect, useState, useCallback } from "react"
import { useAgentWs } from "@/lib/use-agent-ws"
import { type AgentStatus } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Monitor, Loader2 } from "lucide-react"

export function BrowserPreview() {
  const [status, setStatus] = useState<AgentStatus>("Idle")
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [steps, setSteps] = useState<string[]>([])

  const handleStatus = useCallback((s: AgentStatus, reason: string | null) => {
    setStatus(s)
    if (reason) setPauseReason(reason)
  }, [])

  const handleLog = useCallback((message: string) => {
    const match = message.match(/page_url=(.+)/)
    if (match) {
      setCurrentUrl(match[1])
    }
    if (message.startsWith("Step ") || message.startsWith("platform=") || message.startsWith("Agent processing") || message.startsWith("Launching") || message.startsWith("Browser launch")) {
      setSteps(prev => [...prev.slice(-20), message])
    }
  }, [])

  const { connected } = useAgentWs({
    onStatus: handleStatus,
    onLog: handleLog,
  })

  useEffect(() => {
    if (status === "Idle") {
      setCurrentUrl(null)
      setSteps([])
    }
  }, [status])

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {!connected && status !== "Idle" && (
        <div className="bg-yellow-500/10 text-yellow-600 text-xs px-3 py-1.5 border-b border-yellow-500/20">
          Lost connection to backend — reconnecting...
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 overflow-auto">
        {status === "Idle" && !currentUrl && (
          <div className="text-center space-y-3 max-w-md">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground" />
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Ready
            </Badge>
            <p className="text-sm text-muted-foreground">
              Start an application to begin. A stealth browser window will open automatically.
            </p>
          </div>
        )}

        {status === "Running" && (
          <div className="w-full space-y-4 max-w-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <Badge variant="default" className="text-sm px-3 py-1">
                Agent Working
              </Badge>
            </div>

            {currentUrl && (
              <div className="rounded-lg border bg-background p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Current page</p>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all flex items-start gap-1"
                >
                  {currentUrl}
                  <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
                </a>
              </div>
            )}

            {steps.length > 0 && (
              <div className="rounded-lg border bg-background p-3 space-y-1 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground mb-1">Progress</p>
                {steps.map((step, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{step}</p>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Watch the browser window for live action
            </p>
          </div>
        )}

        {status === "Paused" && (
          <div className="w-full space-y-4 max-w-lg">
            <Badge variant="destructive" className="text-sm px-3 py-1">
              Paused
            </Badge>
            {pauseReason && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-600">
                {pauseReason}
              </div>
            )}
            {currentUrl && (
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline break-all flex items-start gap-1"
              >
                {currentUrl}
                <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
              </a>
            )}
          </div>
        )}

        {status === "Idle" && currentUrl && (
          <div className="w-full space-y-3 max-w-md">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Completed
            </Badge>
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline break-all flex items-start gap-1"
            >
              {currentUrl}
              <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}