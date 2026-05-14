"use client"

import { useEffect, useState, useCallback } from "react"
import { useAgentWs } from "@/lib/use-agent-ws"
import { electronAPI } from "@/lib/electron-api"
import { type AgentStatus } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { Monitor, Loader2 } from "lucide-react"

export function BrowserPreview() {
  const [status, setStatus] = useState<AgentStatus>("Idle")
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [attached, setAttached] = useState(false)

  const handleStatus = useCallback((s: AgentStatus, reason: string | null) => {
    setStatus(s)
    setPauseReason(reason)
  }, [])

  const handleLog = useCallback((message: string) => {
    const match = message.match(/page_url=(.+)/)
    if (match) {
      setCurrentUrl(match[1])
    }
  }, [])

  const { connected } = useAgentWs({
    onStatus: handleStatus,
    onLog: handleLog,
  })

  // Attach the browser view when we get a URL and the agent is running
  useEffect(() => {
    if (currentUrl && status === "Running" && !attached) {
      electronAPI.browser.attachUrl(currentUrl).then((result) => {
        if (result?.status === "attached") {
          setAttached(true)
        }
      }).catch(() => {})
    }
  }, [currentUrl, status, attached])

  // Navigate the browser view when the URL changes
  useEffect(() => {
    if (currentUrl && attached) {
      electronAPI.browser.attachUrl(currentUrl).catch(() => {})
    }
  }, [currentUrl, attached])

  // Detach when agent is done
  useEffect(() => {
    if (status === "Idle" && attached) {
      electronAPI.browser.detach().then(() => {
        setAttached(false)
        setCurrentUrl(null)
      }).catch(() => {})
    }
  }, [status, attached])

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {!connected && status !== "Idle" && (
        <div className="bg-yellow-500/10 text-yellow-600 text-xs px-3 py-1.5 border-b border-yellow-500/20">
          Lost connection — reconnecting...
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        {status === "Idle" && !attached && (
          <div className="text-center space-y-3 max-w-md">
            <Monitor className="h-12 w-12 mx-auto text-muted-foreground" />
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Ready
            </Badge>
            <p className="text-sm text-muted-foreground">
              Start an application to begin. The browser preview will appear here.
            </p>
          </div>
        )}

        {status === "Running" && !attached && !currentUrl && (
          <div className="text-center space-y-3 max-w-md">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Starting stealth browser...</p>
          </div>
        )}

        {status === "Running" && currentUrl && !attached && (
          <div className="text-center space-y-3 max-w-md">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Attaching to {currentUrl.slice(0, 50)}...</p>
          </div>
        )}

        {attached && (
          <div className="w-full space-y-2">
            <div className="flex items-center gap-2">
              {status === "Running" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
              <Badge variant={status === "Running" ? "default" : status === "Paused" ? "destructive" : "secondary"} className="text-xs">
                {status === "Running" ? "Agent Working" : status === "Paused" ? "Paused" : "Completed"}
              </Badge>
            </div>
            {currentUrl && (
              <p className="text-xs text-muted-foreground truncate" title={currentUrl}>
                {currentUrl}
              </p>
            )}
          </div>
        )}

        {status === "Paused" && attached && pauseReason && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-600">
            {pauseReason}
          </div>
        )}
      </div>
    </div>
  )
}