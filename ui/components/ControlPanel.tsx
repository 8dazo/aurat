"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAgentWs } from "@/lib/use-agent-ws"
import { type AgentStatus, STAGE_ICONS, STATUS_COLORS, type DetectResult } from "@/lib/constants"
import { electronAPI } from "@/lib/electron-api"
import { toast } from "sonner"
import { ResumeInApply } from "@/components/ResumeInApply"
import { ApplyDetectBanner } from "@/components/ApplyDetectBanner"
import type { MasterProfile } from "@/types"

const STATUS_CONFIG: Record<AgentStatus, { label: string; dot: string; badge: string }> = {
  Idle: {
    label: "Idle",
    dot: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
  Running: {
    label: "Running",
    dot: "bg-green-500 animate-pulse",
    badge: "bg-green-500/15 text-green-400 border-green-500/25",
  },
  Paused: {
    label: "Paused",
    dot: "bg-orange-400 animate-pulse",
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  },
}

interface ControlPanelProps {
  jobUrl?: string
  jobTitle?: string
  jobCompany?: string
  atsType?: string
  profile?: MasterProfile | null
  onProfileChange?: (p: MasterProfile) => void
}

export function ControlPanel({
  jobUrl = "",
  jobTitle = "",
  jobCompany = "",
  atsType = "generic",
  profile = null,
  onProfileChange,
}: ControlPanelProps) {
  const [status, setStatus] = useState<AgentStatus>("Idle")
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  const [stepLogs, setStepLogs] = useState<{ step: string; status: string; message: string; ts: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [answerText, setAnswerText] = useState("")
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null)
  const [localProfile, setLocalProfile] = useState<MasterProfile | null>(profile)
  const logEndRef = useRef<HTMLDivElement>(null)

  // Sync profile prop into local state
  useEffect(() => { setLocalProfile(profile) }, [profile])

  const handleProfileChange = useCallback((p: MasterProfile) => {
    setLocalProfile(p)
    onProfileChange?.(p)
  }, [onProfileChange])

  const handleStatus = useCallback((s: AgentStatus, reason: string | null) => {
    setStatus(s)
    setPauseReason(reason ?? null)
  }, [])

  const handleLog = useCallback((message: string) => {
    // message format: "step | status | detail" (from ws.py broadcast)
    const parts = message.split(" | ")
    const [step, stat, detail] = parts.length >= 2
      ? [parts[0], parts[1], parts.slice(2).join(" | ")]
      : [message, "info", ""]
    setStepLogs(prev => [...prev.slice(-300), { step, status: stat, message: detail || stat, ts: Date.now() }])
  }, [])

  const { connected } = useAgentWs({ onStatus: handleStatus, onLog: handleLog })

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [stepLogs])

  const handleStart = useCallback(async () => {
    if (!jobUrl) { toast.error("No job URL — select a job first"); return }
    if (!localProfile) { toast.error("No profile — upload your resume first"); return }
    setLoading(true)
    setStepLogs([])
    setStatus("Running")
    try {
      await electronAPI.python.request("/apply", {
        job_url: jobUrl,
        job_title: jobTitle,
        job_company: jobCompany,
        ats_type: detectResult?.platform ?? atsType,
        profile: localProfile,
      })
    } catch (err) {
      setStatus("Idle")
      toast.error(err instanceof Error ? err.message : "Failed to start")
    } finally {
      setLoading(false)
    }
  }, [jobUrl, jobTitle, jobCompany, atsType, localProfile, detectResult])

  const handlePause = useCallback(async () => {
    setLoading(true)
    try { await electronAPI.python.request("/pause") }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed to pause") }
    finally { setLoading(false) }
  }, [])

  const handleResume = useCallback(async () => {
    setLoading(true)
    try { await electronAPI.python.request("/resume") }
    catch (err) { toast.error(err instanceof Error ? err.message : "Failed to resume") }
    finally { setLoading(false) }
  }, [])

  const handleAnswerSubmit = useCallback(async () => {
    if (!answerText.trim()) return
    const question = (pauseReason || "").replace(/^Custom question:\s*/i, "")
    try {
      await electronAPI.python.request("/answer", { question, answer: answerText.trim() })
      setAnswerText("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit answer")
    }
  }, [answerText, pauseReason])

  const isCustomQuestion = pauseReason?.startsWith("Custom question:")
  const isReview = pauseReason === "Review before submission"
  const questionLabel = (pauseReason || "").replace(/^Custom question:\s*/i, "")
  const cfg = STATUS_CONFIG[status]

  return (
    <div className="flex h-full flex-col bg-background">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
          <span className="text-sm font-medium">Agent</span>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs ${connected ? "text-muted-foreground" : "text-destructive"}`}>
          <div className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-green-500" : "bg-destructive animate-pulse"}`} />
          {connected ? "Connected" : "Disconnected"}
        </div>
      </div>

      {/* ── Job Info ── */}
      {jobUrl && (
        <div className="px-4 py-3 border-b border-border space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Job</p>
          <p className="text-sm font-semibold truncate">{jobTitle || "Untitled Position"}</p>
          <p className="text-xs text-muted-foreground truncate">{jobCompany}</p>
          <a
            href={jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary/70 hover:text-primary truncate block transition-colors"
          >
            {jobUrl}
          </a>
        </div>
      )}

      {/* ── Pre-flight detection banner ── */}
      {jobUrl && status === "Idle" && !detectResult && (
        <ApplyDetectBanner
          jobUrl={jobUrl}
          onDetected={(r) => setDetectResult(r)}
          onError={() => {}}
        />
      )}
      {detectResult && status === "Idle" && (
        <div className="mx-4 mt-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs flex items-center justify-between">
          <span className="text-muted-foreground">{
            detectResult.page_type === "description_only"
              ? "Will click Apply then fill form"
              : detectResult.page_type === "multi_step"
              ? "Multi-step form detected"
              : `${detectResult.visible_field_count} fields detected`
          }</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary capitalize">
            {detectResult.platform}
          </span>
        </div>
      )}

      {/* ── Resume section ── */}
      <div className="mt-3">
        <ResumeInApply profile={localProfile} onProfileChange={handleProfileChange} />
      </div>

      {/* ── Controls ── */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={handleStart}
            disabled={loading || status === "Running" || !jobUrl || !localProfile}
            className="flex-1 min-w-[80px]"
          >
            {status === "Running" ? (
              <>
                <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Running
              </>
            ) : "Start AI Apply"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handlePause}
            disabled={loading || status !== "Running"}
          >
            Take Control
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleResume}
            disabled={loading || status !== "Paused" || isCustomQuestion || isReview}
          >
            Give Back
          </Button>
        </div>
      </div>

      {/* ── Pause / Intervention Panel ── */}
      {status === "Paused" && pauseReason && (
        <div className="mx-4 mt-3 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 space-y-3">
          {isCustomQuestion ? (
            <>
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0">❓</span>
                <p className="text-xs font-medium text-orange-400">{questionLabel}</p>
              </div>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                rows={3}
                placeholder="Type your answer…"
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAnswerSubmit() }
                }}
              />
              <Button size="sm" className="w-full" onClick={handleAnswerSubmit} disabled={!answerText.trim()}>
                Submit Answer
              </Button>
            </>
          ) : isReview ? (
            <>
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0">👁️</span>
                <p className="text-xs font-medium text-orange-400">Review the form before submitting</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Check all fields are correct, then submit.</p>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleResume}>
                  Submit Now
                </Button>
                <Button size="sm" variant="outline" onClick={handlePause}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">⏸️</span>
              <p className="text-xs text-orange-400">{pauseReason}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Step Log ── */}
      <div className="flex-1 min-h-0 flex flex-col mt-3">
        <div className="px-4 pb-2 flex items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step Log</p>
          {stepLogs.length > 0 && (
            <span className="text-[10px] text-muted-foreground">({stepLogs.length})</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {stepLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No activity yet</p>
          ) : (
            <div className="space-y-1">
              {stepLogs.map((log, i) => {
                const icon = STAGE_ICONS[log.step] ?? "•"
                const color = STATUS_COLORS[log.status] ?? "text-foreground"
                return (
                  <div key={i} className="flex items-start gap-2 py-1 border-b border-border/30">
                    <span className="text-xs shrink-0 mt-0.5 w-5 text-center">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-medium">{log.step}</span>
                        <span className={`text-[10px] ${color}`}>{log.status}</span>
                      </div>
                      {log.message && log.message !== log.status && (
                        <p className="text-[10px] text-muted-foreground truncate">{log.message}</p>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground/50 shrink-0 mt-0.5">
                      {new Date(log.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  )
}