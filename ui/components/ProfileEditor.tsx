"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { electronAPI } from "@/lib/electron-api"
import type { MasterProfile } from "@/types"

interface ProfileEditorProps {
  profile: MasterProfile
  onProfileChange?: (profile: MasterProfile) => void
}

export function ProfileEditor({ profile, onProfileChange }: ProfileEditorProps) {
  const [edited, setEdited] = useState<MasterProfile>(profile)
  const [saving, setSaving] = useState(false)

  const updatePersonalInfo = (field: keyof MasterProfile["personal_info"], value: string) => {
    setEdited((prev) => ({
      ...prev,
      personal_info: { ...prev.personal_info, [field]: value },
    }))
  }

  const updateLink = (field: keyof MasterProfile["links"], value: string) => {
    setEdited((prev) => ({
      ...prev,
      links: { ...prev.links, [field]: value },
    }))
  }

  const updateTrait = (field: keyof MasterProfile["inferred_traits"], value: boolean | number) => {
    setEdited((prev) => ({
      ...prev,
      inferred_traits: { ...prev.inferred_traits, [field]: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await electronAPI.db.saveProfile(edited)
      onProfileChange?.(edited)
      toast.success("Profile saved")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={edited.personal_info.first_name}
              onChange={(e) => updatePersonalInfo("first_name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={edited.personal_info.last_name}
              onChange={(e) => updatePersonalInfo("last_name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={edited.personal_info.email ?? ""}
              onChange={(e) => updatePersonalInfo("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={edited.personal_info.phone ?? ""}
              onChange={(e) => updatePersonalInfo("phone", e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={edited.personal_info.location ?? ""}
              onChange={(e) => updatePersonalInfo("location", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="github">GitHub</Label>
            <Input
              id="github"
              value={edited.links.github ?? ""}
              onChange={(e) => updateLink("github", e.target.value)}
              placeholder="https://github.com/username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={edited.links.linkedin ?? ""}
              onChange={(e) => updateLink("linkedin", e.target.value)}
              placeholder="https://linkedin.com/in/username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leetcode">LeetCode</Label>
            <Input
              id="leetcode"
              value={edited.links.leetcode ?? ""}
              onChange={(e) => updateLink("leetcode", e.target.value)}
              placeholder="https://leetcode.com/username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="portfolio">Portfolio</Label>
            <Input
              id="portfolio"
              value={edited.links.portfolio ?? ""}
              onChange={(e) => updateLink("portfolio", e.target.value)}
              placeholder="https://yoursite.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inferred Traits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Requires Sponsorship</Label>
            <button
              type="button"
              role="switch"
              aria-checked={edited.inferred_traits.requires_sponsorship}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                edited.inferred_traits.requires_sponsorship
                  ? "bg-primary"
                  : "bg-muted"
              }`}
              onClick={() =>
                updateTrait(
                  "requires_sponsorship",
                  !edited.inferred_traits.requires_sponsorship
                )
              }
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-background shadow-lg transition-transform ${
                  edited.inferred_traits.requires_sponsorship
                    ? "translate-x-5"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <Label>Willing to Relocate</Label>
            <button
              type="button"
              role="switch"
              aria-checked={edited.inferred_traits.willing_to_relocate}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                edited.inferred_traits.willing_to_relocate
                  ? "bg-primary"
                  : "bg-muted"
              }`}
              onClick={() =>
                updateTrait(
                  "willing_to_relocate",
                  !edited.inferred_traits.willing_to_relocate
                )
              }
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-background shadow-lg transition-transform ${
                  edited.inferred_traits.willing_to_relocate
                    ? "translate-x-5"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {edited.inferred_traits.years_of_experience != null && (
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input
                type="number"
                value={edited.inferred_traits.years_of_experience}
                onChange={(e) =>
                  updateTrait("years_of_experience", Number(e.target.value))
                }
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {edited.experience.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {edited.experience.map((exp, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-medium">{exp.title}</p>
                    <p className="text-sm text-muted-foreground">{exp.company}</p>
                  </div>
                </div>
                {exp.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {exp.description}
                  </p>
                )}
                {exp.highlights.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {exp.highlights.map((h, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary">&#8226;</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {edited.education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {edited.education.map((edu, i) => (
              <div key={i}>
                <p className="font-medium">{edu.degree}</p>
                <p className="text-sm text-muted-foreground">
                  {edu.institution}
                  {edu.field ? ` - ${edu.field}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {edited.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {edited.skills.map((group, i) => (
              <div key={i}>
                <p className="text-sm font-medium mb-2">{group.category}</p>
                <div className="flex flex-wrap gap-2">
                  {group.skills.map((skill, j) => (
                    <Badge key={j} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {Object.keys(edited.custom_qna_memory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Q&A Memory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(edited.custom_qna_memory).map(([hash, answer]) => (
              <div key={hash} className="flex items-start gap-2 group">
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-muted-foreground break-all">{hash}</p>
                  <p className="text-sm">{answer}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => {
                    setEdited((prev) => {
                      const next = { ...prev.custom_qna_memory }
                      delete next[hash]
                      return { ...prev, custom_qna_memory: next }
                    })
                  }}
                >
                  &times;
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  )
}