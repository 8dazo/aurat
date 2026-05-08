"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { electronAPI, onProfileChange } from "@/lib/electron-api"
import type { MasterProfile } from "@/types"

const navItems = [
  { label: "Dashboard", href: "/", icon: DashboardIcon },
  { label: "Jobs", href: "/jobs", icon: JobsIcon },
  { label: "Apply", href: "/apply", icon: ApplyIcon },
  { label: "History", href: "/history", icon: HistoryIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
]

function DashboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  )
}

function JobsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="16" x="2" y="4" rx="2" />
    </svg>
  )
}

function ApplyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m9.3 6.3 1.4 1.4" />
      <path d="m14.7 6.3-1.4 1.4" />
      <path d="M9 15a3 3 0 0 1 6 0" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [profile, setProfile] = useState<MasterProfile | null>(null)

  const loadProfile = () => {
    electronAPI.db.getProfile().then((data) => {
      if (data) setProfile(data as MasterProfile)
      else setProfile(null)
    }).catch(() => setProfile(null))
  }

  useEffect(() => {
    loadProfile()
  }, [pathname])

  useEffect(() => {
    return onProfileChange(loadProfile)
  }, [])

  const initials = profile
    ? `${profile.personal_info.first_name?.[0] || ""}${profile.personal_info.last_name?.[0] || ""}`.toUpperCase() || "?"
    : null
  const displayName = profile
    ? `${profile.personal_info.first_name} ${profile.personal_info.last_name}`.trim()
    : null

  return (
    <aside className="w-[200px] border-r border-border flex flex-col shrink-0">
      <div className="p-5">
        <h1 className="text-lg font-bold text-primary">Aurat AI</h1>
      </div>
      <Separator />
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link href={item.href}>
                <Button
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3"
                >
                  <item.icon />
                  {item.label}
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-3">
        <Separator className="mb-3" />
        {profile ? (
          <Link href="/" className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent transition-colors">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.personal_info.email || "Profile active"}</p>
            </div>
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent transition-colors">
            <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs shrink-0">
              ?
            </div>
            <p className="text-xs text-muted-foreground">No profile set up</p>
          </Link>
        )}
        <div className="mt-3 text-xs text-muted-foreground px-2">v0.1.0</div>
      </div>
    </aside>
  )
}