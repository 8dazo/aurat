"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { electronAPI } from "@/lib/electron-api"
import type { MasterProfile } from "@/types"

interface Job {
  url: string
  title: string
  company: string
  location: string
  salary_summary: string
  ats_type: string
}

interface AnalyzeResult {
  score: number
  missing_skills: string[]
  matching_skills: string[]
  summary: string
}

interface JobAnalyzerProps {
  job: Job
  profile: MasterProfile | null
  onBack: () => void
}

function ScoreRing({ score }: { score: number }) {
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  let color = "text-red-500"
  let stroke = "stroke-red-500"
  if (score >= 70) {
    color = "text-green-500"
    stroke = "stroke-green-500"
  } else if (score >= 40) {
    color = "text-yellow-500"
    stroke = "stroke-yellow-500"
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="transform -rotate-90" width="150" height="150">
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth="10"
        />
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          className={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className={`absolute text-3xl font-bold ${color}`}>{score}</div>
    </div>
  )
}

export function JobAnalyzer({ job, profile, onBack }: JobAnalyzerProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleAutoApply = () => {
    const params = new URLSearchParams({
      url: job.url,
      title: job.title,
      company: job.company,
      ats_type: job.ats_type || "greenhouse",
    })
    if (job.location) params.set("location", job.location)
    router.push(`/apply?${params.toString()}`)
  }

  const handleAnalyze = async () => {
    if (!profile) {
      setError("No profile loaded. Please set up your profile first.")
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await electronAPI.python.request("/analyze", {
        profile: profile,
        job_url: job.url,
      }) as AnalyzeResult
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack}>
        &larr; Back to Jobs
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{job.title}</CardTitle>
          <CardDescription>
            {job.company}
            {job.location ? ` &middot; ${job.location}` : ""}
            {job.salary_summary ? ` &middot; ${job.salary_summary}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {job.ats_type && (
            <Badge variant="secondary">{job.ats_type}</Badge>
          )}
        </CardContent>
      </Card>

      {!result && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <p className="text-muted-foreground text-sm">
              Analyze how well your profile matches this job posting.
            </p>
            <Button onClick={handleAnalyze} disabled={!profile}>
              Analyze Match
            </Button>
            {!profile && (
              <p className="text-xs text-destructive">
                Profile required to analyze matches.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">Analyzing match...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-4">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Match Analysis</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <ScoreRing score={result.score} />

            {result.matching_skills.length > 0 && (
              <div className="w-full space-y-2">
                <p className="text-sm font-medium">Matching Skills</p>
                <div className="flex flex-wrap gap-2">
                  {result.matching_skills.map((skill) => (
                    <Badge key={skill} className="bg-green-500/20 text-green-400 border-green-500/30">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.missing_skills.length > 0 && (
              <div className="w-full space-y-2">
                <p className="text-sm font-medium">Missing Skills</p>
                <div className="flex flex-wrap gap-2">
                  {result.missing_skills.map((skill) => (
                    <Badge key={skill} variant="destructive">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.summary && (
              <div className="w-full space-y-2">
                <p className="text-sm font-medium">Summary</p>
                <p className="text-sm text-muted-foreground">{result.summary}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleAutoApply} disabled={!profile}>
              Auto-Apply
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}