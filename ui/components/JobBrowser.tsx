"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { electronAPI } from "@/lib/electron-api"
import { JobAnalyzer } from "@/components/JobAnalyzer"
import type { MasterProfile } from "@/types"

interface Job {
  url: string
  title: string
  company: string
  location: string
  salarySummary: string | null
  atsType: string | null
  postedAt: string | null
}

interface JobsResponse {
  jobs: Job[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function TableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Salary</TableHead>
          <TableHead>ATS Type</TableHead>
          <TableHead>Posted</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 10 }).map((_, i) => (
          <TableRow key={i}>
            {Array.from({ length: 7 }).map((_, j) => (
              <TableCell key={j}>
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function JobBrowser() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [atsType, setAtsType] = useState<string>("all")
  const [location, setLocation] = useState<string>("all")
  const [postedWithin, setPostedWithin] = useState<string>("all")
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [profile, setProfile] = useState<MasterProfile | null>(null)

  useEffect(() => {
    electronAPI.db.getProfile().then((p) => {
      if (p) setProfile(p as MasterProfile)
    })
  }, [])

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = { page: String(page), pageSize: "50" }
      if (search) params.search = search
      if (atsType !== "all") params.atsType = atsType
      if (location !== "all") params.location = location
      if (postedWithin !== "all") params.postedWithin = postedWithin

      const result = await electronAPI.python.request("/jobs", params) as JobsResponse
      setJobs(result.jobs ?? [])
      setTotal(result.total ?? 0)
      setTotalPages(result.totalPages ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch jobs")
      setJobs([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [page, search, atsType, location, postedWithin])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const handleSearch = () => {
    setPage(1)
    fetchJobs()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  const handleAnalyze = (job: Job) => {
    setSelectedJob(job)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  if (selectedJob) {
    return (
      <JobAnalyzer
        job={selectedJob}
        profile={profile}
        onBack={() => setSelectedJob(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {(total ?? 0).toLocaleString()} jobs found
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Input
            placeholder="Search by title or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="max-w-xs"
          />
          <Button variant="outline" onClick={handleSearch}>
            Search
          </Button>
        </div>

        <Select value={atsType} onValueChange={(v) => { setAtsType(v ?? "all"); setPage(1) }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="ATS Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>ATS Type</SelectLabel>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="greenhouse">Greenhouse</SelectItem>
              <SelectItem value="lever">Lever</SelectItem>
              <SelectItem value="icims">iCIMS</SelectItem>
              <SelectItem value="workday">Workday</SelectItem>
              <SelectItem value="taleo">Taleo</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={location} onValueChange={(v) => { setLocation(v ?? "all"); setPage(1) }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Location</SelectLabel>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="onsite">On-site</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={postedWithin} onValueChange={(v) => { setPostedWithin(v ?? "all"); setPage(1) }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Posted Within" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Posted Within</SelectLabel>
              <SelectItem value="all">Any time</SelectItem>
              <SelectItem value="24h">24 hours</SelectItem>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>ATS Type</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.url}>
                  <TableCell className="font-medium max-w-[250px] truncate">
                    {job.title}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {job.company}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {job.location}
                  </TableCell>
                  <TableCell>{job.salarySummary || "—"}</TableCell>
                  <TableCell>
                    {job.atsType ? (
                      <Badge variant="secondary">{job.atsType}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{formatDate(job.postedAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnalyze(job)}
                    >
                      Analyze
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}