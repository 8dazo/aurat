"use client"

import { useEffect, useState, useCallback } from "react"
import { useAgentWs } from "@/lib/use-agent-ws"
import { electronAPI } from "@/lib/electron-api"
import { type AgentStatus } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Monitor } from "lucide-react"

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

  // Navigate Electron's browser view to the current page URL
  useEffect(() => {
    if (!currentUrl || status === "Idle") return
    electronAPI.browser.attachUrl(currentUrl).then((result) => {
      if (result?.status === "attached") {
        setAttached(true)
      }
    }).catch(() => {})
  }, [currentUrl, status])

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
          Lost connection to backend — reconnecting...
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
              Start an application to begin. The browser preview will appear here automatically.
            </p>
          </div>
        )}

        {status === "Running" && !attached && !currentUrl && (
          <div className="text-center space-y-3 max-w-md">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Starting stealth browser...</p>
          </div>
        )}

        {status === "Running" && attached && currentUrl && (
          <div className="w-full space-y-3">
            <Badge variant="default" className="text-sm px-3 py-1">
              Agent Working — preview active
            </Badge>
            <p className="text-xs text-muted-foreground truncate max-w-full" title={currentUrl}>
              {currentUrl}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span>Live view from stealth browser</span>
            </div>
          </div>
        )}

        {status === "Running" && attached && !currentUrl && (
          <div className="w-full space-y-3">
            <Badge variant="default" className="text-sm px-3 py-1">
              Agent Working — loading page...
            </Badge>
          </div>
        )}

        {status === "Paused" && attached && (
          <div className="w-full space-y-3">
            <Badge variant="destructive" className="text-sm px-3 py-1">
              Paused
            </Badge>
            {pauseReason && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-600">
                {pauseReason}
              </div>
            )}
            {currentUrl && (
              <p className="text-xs text-muted-foreground truncate" title={currentUrl}>
                {currentUrl}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}