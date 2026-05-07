"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { electronAPI } from "@/lib/electron-api"

interface HistoryEntry {
  id: string
  jobTitle: string
  company: string
  platform: string
  matchScore: number | null
  status: "pending" | "running" | "paused" | "completed" | "failed"
  date: string
}

const statusConfig: Record<HistoryEntry["status"], { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  running: { label: "Running", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  paused: { label: "Paused", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  completed: { label: "Completed", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  failed: { label: "Failed", className: "bg-red-500/20 text-red-400 border-red-500/30" },
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    electronAPI.db.getHistory().then((data) => {
      const mapped = ((data as Record<string, unknown>[]) || []).map((item: Record<string, unknown>) => ({
        id: String(item.id ?? ""),
        jobTitle: String(item.job_title ?? ""),
        company: String(item.company ?? ""),
        platform: String(item.ats_platform ?? ""),
        matchScore: item.match_score != null ? Number(item.match_score) : null,
        status: String(item.status ?? "pending") as HistoryEntry["status"],
        date: String(item.created_at ?? ""),
      }))
      setHistory(mapped)
      setLoading(false)
    }).catch(() => {
      setHistory([])
      setLoading(false)
    })
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Application History</h1>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">No application history yet.</p>
          <p className="text-muted-foreground text-xs mt-1">
            Applications will appear here after you start auto-applying.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Match Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">{entry.jobTitle}</TableCell>
                <TableCell>{entry.company}</TableCell>
                <TableCell>{entry.platform}</TableCell>
                <TableCell>
                  {entry.matchScore != null ? `${entry.matchScore}%` : "—"}
                </TableCell>
                <TableCell>
                  <Badge className={statusConfig[entry.status].className}>
                    {statusConfig[entry.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(entry.date).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}