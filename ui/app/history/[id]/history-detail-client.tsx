"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { electronAPI } from "@/lib/electron-api"

interface StepLog {
  step: string
  status: string
  detail?: string
}

interface CustomQuestion {
  question: string
  answer: string
}

interface HistoryDetail {
  id: number
  job_url: string
  snapshot_url?: string
  ats_platform: string
  job_title: string
  company: string
  match_score: number | null
  status: string
  steps_log: string | StepLog[]
  custom_questions: string | CustomQuestion[]
  created_at: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  running:   { label: "Running",   className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  paused:    { label: "Paused",    className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  completed: { label: "Completed", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  failed:    { label: "Failed",    className: "bg-red-500/20 text-red-400 border-red-500/30" },
}

const STAGE_ICONS: Record<string, string> = {
  navigate: "🧭", detect: "🔍", click_apply: "🖱️",
  detect_fields: "📋", map_fields: "🧠", fill_fields: "✍️",
  review: "👁️", submit: "📤", done: "✅",
}

const STATUS_COLORS: Record<string, string> = {
  running: "text-blue-400", completed: "text-green-400",
  paused: "text-orange-400", skipped: "text-muted-foreground", error: "text-destructive",
}

function parseJson<T>(val: string | T, fallback: T): T {
  if (typeof val === "string") {
    try { return JSON.parse(val) as T } catch { return fallback }
  }
  return val ?? fallback
}

export default function HistoryDetailClient() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [entry, setEntry] = useState<HistoryDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    electronAPI.python.request(`/db/history/${id}`)
      .then((data) => {
        setEntry(data as HistoryDetail)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">Session not found</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/history")}>
          Back to History
        </Button>
      </div>
    )
  }

  const steps = parseJson<StepLog[]>(entry.steps_log, [])
  const questions = parseJson<CustomQuestion[]>(entry.custom_questions, [])
  const statusCfg = statusConfig[entry.status] ?? statusConfig.pending

  const handleReApply = () => {
    const params = new URLSearchParams({
      url: entry.job_url,
      title: entry.job_title,
      company: entry.company,
      ats_type: entry.ats_platform,
    })
    router.push(`/apply?${params.toString()}`)
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => router.push("/history")}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          History
        </Button>
      </div>

      {/* Job Header Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{entry.job_title || "Untitled Position"}</h1>
            <p className="text-muted-foreground mt-0.5">{entry.company || "Unknown Company"}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                {entry.ats_platform || "generic"}
              </span>
              {entry.match_score != null && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                  {entry.match_score}% match
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {entry.created_at ? new Date(entry.created_at).toLocaleString() : ""}
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <a
              href={entry.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted transition-colors"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              Open
            </a>
            <Button size="sm" onClick={handleReApply} className="gap-1.5">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Re-Apply
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step Log */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
            </svg>
            Step Log
            <span className="text-xs text-muted-foreground font-normal">({steps.length} steps)</span>
          </h2>

          {steps.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No steps recorded</p>
          ) : (
            <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
              {steps.map((s, i) => {
                const icon = STAGE_ICONS[s.step] ?? "•"
                const color = STATUS_COLORS[s.status] ?? "text-foreground"
                return (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
                    <span className="text-xs shrink-0 w-5 text-center mt-0.5">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-medium">{s.step}</span>
                        <span className={`text-[10px] ${color}`}>{s.status}</span>
                      </div>
                      {s.detail && (
                        <p className="text-[10px] text-muted-foreground truncate">{s.detail}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Custom Q&A */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
            </svg>
            Custom Q&amp;A
            <span className="text-xs text-muted-foreground font-normal">({questions.length})</span>
          </h2>

          {questions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No custom questions in this session</p>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {questions.map((q, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{q.question}</p>
                  <p className="text-xs">{q.answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}