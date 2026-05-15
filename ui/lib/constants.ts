export type AgentStatus = "Idle" | "Running" | "Paused"

export const STAGE_ICONS: Record<string, string> = {
  navigate: "🧭",
  detect: "🔍",
  click_apply: "🖱️",
  detect_fields: "📋",
  map_fields: "🧠",
  fill_fields: "✍️",
  review: "👁️",
  submit: "📤",
  done: "✅",
}

export const STATUS_COLORS: Record<string, string> = {
  running: "text-blue-400",
  completed: "text-green-400",
  paused: "text-orange-400",
  skipped: "text-muted-foreground",
  error: "text-destructive",
}

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:18732"

export const ENGINE_PORT = 18732

export interface DetectResult {
  platform: string
  page_type: "description_only" | "form" | "multi_step"
  visible_field_count: number
  form_count?: number
  snapshot_url?: string
}

export interface Job {
  id: string
  title: string
  company: string
  url: string
  location?: string
  atsType?: string
  postedAt?: string
  description?: string
}