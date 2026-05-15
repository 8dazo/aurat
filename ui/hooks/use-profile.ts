"use client"

import { useState, useEffect, useCallback } from "react"
import { electronAPI } from "@/lib/electron-api"
import type { MasterProfile } from "@/types"

export function useProfile() {
  const [profile, setProfile] = useState<MasterProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    try {
      const data = await electronAPI.db.getProfile()
      if (data) {
        setProfile(data as MasterProfile)
      }
    } catch (err) {
      console.error("Failed to load profile:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  return { profile, setProfile, loading, reload: loadProfile }
}