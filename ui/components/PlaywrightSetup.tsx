"use client"

import { useEffect, useState, useCallback } from "react"
import { electronAPI } from "@/lib/electron-api"

interface PlaywrightSetupProps {
  onComplete: () => void
}

export function PlaywrightSetup({ onComplete }: PlaywrightSetupProps) {
  const [status, setStatus] = useState<"checking" | "installing" | "ready" | "error">("checking")

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const result = await electronAPI.python.request("/health")
      if (result && typeof result === "object" && "status" in (result as Record<string, unknown>)) {
        return (result as Record<string, unknown>).status === "ok"
      }
      return false
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    async function run() {
      const isReady = await checkHealth()
      if (cancelled) return

      if (isReady) {
        setStatus("ready")
        setTimeout(() => onComplete(), 800)
        return
      }

      setStatus("installing")

      interval = setInterval(async () => {
        if (cancelled) return
        const ready = await checkHealth()
        if (ready) {
          if (interval) clearInterval(interval)
          setStatus("ready")
          setTimeout(() => onComplete(), 800)
        }
      }, 3000)
    }

    run()

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [checkHealth, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold">Setting up Aurat AI...</h1>
          <p className="text-muted-foreground">
            {status === "checking" && "Checking browser engine..."}
            {status === "installing" && "Installing browser engine..."}
            {status === "ready" && "Browser engine ready!"}
            {status === "error" && "Setup failed. Please restart the application."}
          </p>
        </div>

        <div className="w-64 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{
              width: status === "ready" ? "100%" : "33%",
              animation: status === "installing" ? "pulse 1.5s ease-in-out infinite" : undefined,
            }}
          />
        </div>

        {status === "installing" && (
          <p className="text-xs text-muted-foreground">
            This may take a few minutes on first run
          </p>
        )}
      </div>
    </div>
  )
}