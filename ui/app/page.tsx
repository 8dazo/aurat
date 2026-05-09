"use client"

import { useState, useEffect } from "react"
import { ResumeDropzone } from "@/components/ResumeDropzone"
import { ProfileEditor } from "@/components/ProfileEditor"
import { electronAPI } from "@/lib/electron-api"
import { Button } from "@/components/ui/button"
import type { MasterProfile } from "@/types"

export default function Home() {
  const [profile, setProfile] = useState<MasterProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async () => {
    try {
      const data = await electronAPI.db.getProfile()
      if (data && typeof data === 'object' && (data as MasterProfile).personal_info) setProfile(data as MasterProfile)
      else setProfile(null)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleDelete = async () => {
    if (!confirm("Delete your profile? You can re-upload your resume anytime.")) return
    const empty = {
      personal_info: { first_name: "", last_name: "" },
      inferred_traits: { requires_sponsorship: false, willing_to_relocate: false },
      links: {},
      experience: [],
      education: [],
      skills: [],
      custom_qna_memory: {},
    }
    await electronAPI.db.saveProfile(empty)
    setProfile(null)
  }

  const handleReupload = () => {
    setProfile(null)
  }

  return (
    <>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            {profile ? "Your profile is ready" : "Upload your resume to get started"}
          </p>
        </div>
        {profile && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReupload}>
              Re-upload Resume
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Delete Profile
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg
            className="animate-spin h-8 w-8 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : profile ? (
        <ProfileEditor profile={profile} onProfileChange={setProfile} />
      ) : (
        <div className="max-w-xl mx-auto relative">
          <ResumeDropzone onProfileExtracted={setProfile} />
        </div>
      )}
    </>
  )
}