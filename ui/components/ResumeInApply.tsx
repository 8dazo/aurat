"use client"

import { useState, useCallback } from "react"
import { electronAPI } from "@/lib/electron-api"
import { toast } from "sonner"
import type { MasterProfile } from "@/types"

interface ResumeInApplyProps {
  profile: MasterProfile | null
  onProfileChange: (p: MasterProfile) => void
}

export function ResumeInApply({ profile, onProfileChange }: ResumeInApplyProps) {
  const [uploading, setUploading] = useState(false)
  const resumePath: string | undefined = (profile as Record<string, unknown> | null)?.["resume_path"] as string | undefined
  const hasResume = !!resumePath

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are accepted")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit")
      return
    }
    setUploading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((d, b) => d + String.fromCharCode(b), "")
      )

      // 1. Save PDF to disk (for file-picker uploads)
      await electronAPI.python.request("/resume/save", { filename: file.name, data: base64 })

      // 2. Extract profile
      const result = await electronAPI.python.request("/extract-base64", {
        filename: file.name,
        data: base64,
      })
      const newProfile = result as MasterProfile
      await electronAPI.db.saveProfile(newProfile)
      onProfileChange(newProfile)
      toast.success("Resume uploaded & extracted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }, [onProfileChange])

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="px-4 py-3 border-b border-border">
      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Resume</p>
      {uploading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
          Processing resume…
        </div>
      ) : hasResume ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-green-500/15 text-green-500">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">resume.pdf</p>
              <p className="text-[10px] text-green-500">Ready for upload</p>
            </div>
          </div>
          <label className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
            Change
            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={onInputChange} />
          </label>
        </div>
      ) : (
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-dashed border-muted-foreground/40 group-hover:border-primary transition-colors">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium group-hover:text-primary transition-colors">Upload Resume</p>
            <p className="text-[10px] text-muted-foreground">PDF, max 10MB</p>
          </div>
          <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={onInputChange} />
        </label>
      )}
    </div>
  )
}
