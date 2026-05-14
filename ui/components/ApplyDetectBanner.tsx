"use client"

import React, { useEffect, useState } from "react"
import { type DetectResult } from "@/lib/constants"
import { electronAPI } from "@/lib/electron-api"

interface ApplyDetectBannerProps {
  jobUrl: string
  onDetected: (result: DetectResult) => void
  onError: () => void
}

const PLATFORM_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  workday: "Workday",
  ashby: "Ashby",
  icims: "iCIMS",
  generic: "Generic ATS",
}

const PAGE_TYPE_LABELS: Record<string, string> = {
  description_only: "Job description — click Apply to open form",
  form: "Application form detected",
  multi_step: "Multi-step application",
}

const PAGE_TYPE_ICON: Record<string, React.ReactElement> = {
  description_only: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  ),
  form: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
    </svg>
  ),
  multi_step: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
    </svg>
  ),
}

export function ApplyDetectBanner({ jobUrl, onDetected, onError }: ApplyDetectBannerProps) {
  const [phase, setPhase] = useState<"scanning" | "done" | "error">("scanning")
  const [result, setResult] = useState<DetectResult | null>(null)
  const [dots, setDots] = useState(".")

  // Animated dots while scanning
  useEffect(() => {
    if (phase !== "scanning") return
    const id = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500)
    return () => clearInterval(id)
  }, [phase])

  // Kick off the detection call once
  useEffect(() => {
    if (!jobUrl) return
    let cancelled = false

    const detect = async () => {
      try {
        const raw = await electronAPI.python.request(
          "/apply/detect",
          { job_url: jobUrl }
        )
        if (cancelled) return
        const data = raw as DetectResult
        setResult(data)
        setPhase("done")
        onDetected(data)
      } catch {
        if (!cancelled) {
          setPhase("error")
          onError()
        }
      }
    }

    detect()
    return () => { cancelled = true }
  }, [jobUrl])

  if (phase === "scanning") {
    return (
      <div className="mx-4 mt-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Analyzing page{dots}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[260px]">{jobUrl}</p>
          </div>
        </div>
      </div>
    )
  }

  if (phase === "error" || !result) {
    return (
      <div className="mx-4 mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
        <p className="text-xs text-destructive">Could not analyze page — you can still start manually.</p>
      </div>
    )
  }

  return (
    <div className="mx-4 mt-3 rounded-lg border border-border bg-muted/20 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium">
          {PAGE_TYPE_ICON[result.page_type]}
          <span>{PAGE_TYPE_LABELS[result.page_type]}</span>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {PLATFORM_LABELS[result.platform] ?? result.platform}
        </span>
      </div>
      {result.visible_field_count > 0 && (
        <p className="text-[10px] text-muted-foreground">
          {result.visible_field_count} visible field{result.visible_field_count !== 1 ? "s" : ""} detected
        </p>
      )}
    </div>
  )
}
