"use client"

import { useAgentStatus } from "@/lib/use-agent-ws"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function AgentNotificationBar() {
  const { status, pauseReason } = useAgentStatus()
  const router = useRouter()

  if (status !== "Paused" || !pauseReason) return null

  const isQuestion = pauseReason.startsWith("Custom question:")
  const questionText = isQuestion 
    ? pauseReason.replace("Custom question:", "").trim()
    : "Agent requires manual intervention"

  return (
    <div className="bg-gradient-to-r from-orange-600 to-amber-500 text-white py-2 px-4 flex items-center justify-between shadow-lg relative z-[9999] border-b border-orange-500/20 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex h-2 w-2 shrink-0 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
        <span className="text-[10px] shrink-0 font-semibold uppercase tracking-wider bg-orange-700/40 px-1.5 py-0.5 rounded">
          Intervention Needed
        </span>
        <p className="text-xs font-medium truncate min-w-0">
          {questionText}
        </p>
      </div>
      <Button 
        size="sm" 
        variant="secondary" 
        className="h-7 px-3 text-xs shrink-0 bg-white text-orange-700 hover:bg-orange-50 font-semibold transition-colors"
        onClick={() => router.push("/apply")}
      >
        Answer Now
      </Button>
    </div>
  )
}
