"use client"

import { LivePreview } from "@/components/LivePreview"
import { ControlPanel } from "@/components/ControlPanel"

export default function ApplyPage() {
  return (
    <div data-fullscreen className="flex h-[calc(100vh-56px)]">
      <div className="flex-1">
        <LivePreview />
      </div>
      <div className="w-[400px] border-l border-border">
        <ControlPanel />
      </div>
    </div>
  )
}