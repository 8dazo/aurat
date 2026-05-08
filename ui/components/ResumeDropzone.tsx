"use client"

import { useCallback, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { electronAPI } from "@/lib/electron-api"
import type { MasterProfile } from "@/types"

const MAX_FILE_SIZE = 10 * 1024 * 1024

interface ResumeDropzoneProps {
  onProfileExtracted: (profile: MasterProfile) => void
}

export function ResumeDropzone({ onProfileExtracted }: ResumeDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are accepted")
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File size exceeds 10MB limit")
        return
      }

      setIsExtracting(true)
      try {
        const arrayBuffer = await file.arrayBuffer()
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        )

        const result = await electronAPI.python.request("/extract-base64", {
          filename: file.name,
          data: base64,
        })
        const profile = result as MasterProfile
        await electronAPI.db.saveProfile(profile)
        onProfileExtracted(profile)
        toast.success("Resume extracted successfully")
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to extract resume"
        )
      } finally {
        setIsExtracting(false)
      }
    },
    [onProfileExtracted]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <Card
      className={`border-2 border-dashed transition-colors cursor-pointer ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <CardContent className="relative flex flex-col items-center justify-center py-16">
        {isExtracting ? (
          <>
            <svg
              className="animate-spin h-10 w-10 text-primary mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-muted-foreground">Extracting resume data...</p>
          </>
        ) : (
          <>
            <svg
              className="h-10 w-10 text-muted-foreground mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-lg font-medium mb-1">
              Drop your resume PDF here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse files (max 10MB)
            </p>
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={onInputChange}
              style={{ position: "absolute" }}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}