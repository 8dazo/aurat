"use client"

import { ControlPanel } from "@/components/ControlPanel"
import { BrowserPreview } from "@/components/BrowserPreview"
import { useState, useEffect, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useAgentWs } from "@/lib/use-agent-ws"
import { electronAPI } from "@/lib/electron-api"
import type { MasterProfile } from "@/types"

function ApplyPageInner() {
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<MasterProfile | null>(null)

  const jobUrl = searchParams.get("url") || ""
  const jobTitle = searchParams.get("title") || ""
  const jobCompany = searchParams.get("company") || ""
  const atsType = searchParams.get("ats_type") || "generic"

  // Load saved profile on mount
  useEffect(() => {
    electronAPI.db.getProfile().then((p) => {
      if (p) setProfile(p as MasterProfile)
    })
  }, [])

  const handleProfileChange = useCallback((p: MasterProfile) => {
    setProfile(p)
  }, [])

  return (
    // No data-fullscreen — sidebar stays visible. Layout: BrowserPreview flex-1 + ControlPanel 380px
    <div className="flex h-[calc(100vh-0px)] -mt-8 -mx-8">
      {/* Browser Preview */}
      <div className="flex-1 overflow-hidden border-r border-border">
        <BrowserPreview />
      </div>

      {/* Apply Control Panel */}
      <div className="w-[380px] shrink-0 overflow-y-auto bg-background">
        <ControlPanel
          jobUrl={jobUrl}
          jobTitle={jobTitle}
          jobCompany={jobCompany}
          atsType={atsType}
          profile={profile}
          onProfileChange={handleProfileChange}
        />
      </div>
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