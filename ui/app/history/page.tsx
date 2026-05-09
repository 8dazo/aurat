"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { electronAPI } from "@/lib/electron-api"

interface HistoryEntry {
  id: string
  jobTitle: string
  company: string
  platform: string
  matchScore: number | null
  status: "pending" | "running" | "paused" | "completed" | "failed"
  date: string
  jobUrl: string
}

const statusConfig: Record<HistoryEntry["status"], { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  running:   { label: "Running",   className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  paused:    { label: "Paused",    className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  completed: { label: "Completed", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  failed:    { label: "Failed",    className: "bg-red-500/20 text-red-400 border-red-500/30" },
}

export default function HistoryPage() {
  const router = useRouter()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    electronAPI.db.getHistory().then((data) => {
      const mapped = ((data as Record<string, unknown>[]) || []).map((item) => ({
        id: String(item.id ?? ""),
        jobTitle: String(item.job_title ?? ""),
        company: String(item.company ?? ""),
        platform: String(item.ats_platform ?? ""),
        matchScore: item.match_score != null ? Number(item.match_score) : null,
        status: String(item.status ?? "pending") as HistoryEntry["status"],
        date: String(item.created_at ?? ""),
        jobUrl: String(item.job_url ?? ""),
      }))
      setHistory(mapped)
      setLoading(false)
    }).catch(() => {
      setHistory([])
      setLoading(false)
    })
  }, [])

  const handleReApply = (e: React.MouseEvent, entry: HistoryEntry) => {
    e.stopPropagation()
    const params = new URLSearchParams({
      url: entry.jobUrl,
      title: entry.jobTitle,
      company: entry.company,
      ats_type: entry.platform,
    })
    router.push(`/apply?${params.toString()}`)
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Application History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {history.length > 0
              ? `${history.length} application${history.length !== 1 ? "s" : ""}`
              : "No applications yet"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5M12 7v5l4 2"/>
            </svg>
          </div>
          <p className="text-muted-foreground">No application history yet</p>
          <p className="text-xs text-muted-foreground mt-1">Applications appear here after auto-applying</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/jobs")}>
            Browse Jobs
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/history/${entry.id}`)}
                >
                  <TableCell className="font-medium">{entry.jobTitle || "—"}</TableCell>
                  <TableCell>{entry.company || "—"}</TableCell>
                  <TableCell>
                    <span className="capitalize text-xs rounded-full bg-muted px-2 py-0.5">
                      {entry.platform || "generic"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {entry.matchScore != null ? `${entry.matchScore}%` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig[entry.status].className}>
                      {statusConfig[entry.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {entry.date ? new Date(entry.date).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => handleReApply(e, entry)}
                      title="Re-apply to this job"
                    >
                      Re-Apply
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}