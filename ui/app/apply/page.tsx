"use client"

import { LivePreview } from "@/components/LivePreview"
import { ControlPanel } from "@/components/ControlPanel"
import { ManualIntervention } from "@/components/ManualIntervention"
import { useState, useEffect } from "react"
import { useAgentWs } from "@/lib/use-agent-ws"
import { electronAPI } from "@/lib/electron-api"

export default function ApplyPage() {
  const [isPaused, setIsPaused] = useState(false)
  const [pauseReason, setPauseReason] = useState("")

  useAgentWs({
    onStatus: (status, reason) => {
      setIsPaused(status === "Paused")
      setPauseReason(reason || "")
    },
  })

  const handleSubmitAnswer = async (answer: string) => {
    await electronAPI.python.request("/answer", {
      question: pauseReason,
      answer,
    })
  }

  const handleResume = async () => {
    await electronAPI.python.request("/resume")
  }

  return (
    <div data-fullscreen className="flex h-[calc(100vh-56px)]">
      <div className="flex-1">
        <LivePreview />
      </div>
      <div className="w-[400px] border-l border-border">
        <ControlPanel />
      </div>
      <ManualIntervention
        isPaused={isPaused}
        pauseReason={pauseReason}
        isQuestion={pauseReason.includes("Custom question")}
        question={pauseReason}
        onSubmitAnswer={handleSubmitAnswer}
        onResume={handleResume}
      />
    </div>
  )
}