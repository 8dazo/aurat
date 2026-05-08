"use client"

import { ControlPanel } from "@/components/ControlPanel"
import { ManualIntervention } from "@/components/ManualIntervention"
import { BrowserPreview } from "@/components/BrowserPreview"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useAgentWs } from "@/lib/use-agent-ws"
import { electronAPI } from "@/lib/electron-api"
import type { MasterProfile } from "@/types"

function ApplyPageInner() {
  const searchParams = useSearchParams()
  const [isPaused, setIsPaused] = useState(false)
  const [pauseReason, setPauseReason] = useState("")
  const [profile, setProfile] = useState<MasterProfile | null>(null)

  const jobUrl = searchParams.get("url") || ""
  const jobTitle = searchParams.get("title") || ""
  const jobCompany = searchParams.get("company") || ""
  const atsType = searchParams.get("ats_type") || "greenhouse"

  useEffect(() => {
    electronAPI.db.getProfile().then((p) => {
      if (p) setProfile(p as MasterProfile)
    })
  }, [])

  useAgentWs({
    onStatus: (status, reason) => {
      setIsPaused(status === "Paused")
      setPauseReason(reason || "")
    },
  })

  return (
    <div data-fullscreen className="flex h-[calc(100vh-0px)]">
      <div className="flex-1 overflow-hidden">
        <BrowserPreview />
      </div>
      <div className="w-[400px] border-l border-border shrink-0 overflow-y-auto">
        <ControlPanel
          jobUrl={jobUrl}
          jobTitle={jobTitle}
          jobCompany={jobCompany}
          atsType={atsType}
          profile={profile}
        />
      </div>
      <ManualIntervention
        isPaused={isPaused}
        pauseReason={pauseReason}
        isQuestion={pauseReason.includes("Custom question")}
        question={pauseReason}
        onSubmitAnswer={async (answer) => {
          try {
            await electronAPI.python.request("/answer", {
              question: pauseReason,
              answer,
            })
          } catch {}
        }}
        onResume={async () => {
          try {
            await electronAPI.python.request("/resume")
          } catch {}
        }}
      />
    </div>
  )
}

export default function ApplyPage() {
  return (
    <Suspense>
      <ApplyPageInner />
    </Suspense>
  )
}