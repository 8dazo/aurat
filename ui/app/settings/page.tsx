"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { electronAPI } from "@/lib/electron-api"
import { toast } from "sonner"

type ModelOption = "liquid/lfm-2.5-1.2b-thinking:free" | "anthropic/claude-3.5-sonnet" | "openrouter/auto" | "custom"

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [model, setModel] = useState<ModelOption>("liquid/lfm-2.5-1.2b-thinking:free")
  const [customModel, setCustomModel] = useState("")
  const [llmTestStatus, setLlmTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")

  const [dbConfigured, setDbConfigured] = useState(false)
  const [dbStatus, setDbStatus] = useState<"unknown" | "connected" | "not-configured" | "testing" | "error">("unknown")

  const [browserStatus, setBrowserStatus] = useState<"unknown" | "ok" | "error" | "checking">("unknown")

  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle")

  useEffect(() => {
    const stored = localStorage.getItem("aurat-settings")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.apiKey) setApiKey(parsed.apiKey)
        if (parsed.model) setModel(parsed.model)
        if (parsed.customModel) setCustomModel(parsed.customModel)
      } catch {
        console.warn("Failed to parse stored settings")
      }
    }

    checkDbConnection()
    checkBrowser()
  }, [])

  async function testLlmConnection() {
    setLlmTestStatus("testing")
    try {
      const res = await electronAPI.python.request("/health")
      if (res && typeof res === "object" && (res as Record<string, unknown>).status === "ok") {
        setLlmTestStatus("success")
      } else {
        setLlmTestStatus("error")
      }
    } catch {
      toast.error("Failed to test LLM connection")
      setLlmTestStatus("error")
    }
  }

  async function checkDbConnection() {
    setDbStatus("testing")
    try {
      const profile = await electronAPI.db.getProfile()
      setDbConfigured(true)
      setDbStatus("connected")
    } catch {
      setDbConfigured(false)
      setDbStatus("error")
    }
  }

  async function checkBrowser() {
    setBrowserStatus("checking")
    try {
      const result = await electronAPI.python.request("/health")
      if (result && typeof result === "object" && (result as Record<string, unknown>).status === "ok") {
        setBrowserStatus("ok")
      } else {
        setBrowserStatus("error")
      }
    } catch {
      setBrowserStatus("error")
    }
  }

  function handleSave() {
    localStorage.setItem(
      "aurat-settings",
      JSON.stringify({ apiKey, model, customModel })
    )
    setSaveStatus("saved")
    setTimeout(() => setSaveStatus("idle"), 2000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">Configure Aurat AI</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OpenRouter Configuration</CardTitle>
          <CardDescription>Set up your language model connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">OPENROUTER_API_KEY</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                />
              </div>
              <Button
                variant="outline"
                size="default"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? "Hide" : "Show"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Select
              value={model}
              onValueChange={(v) => setModel(v as ModelOption)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="liquid/lfm-2.5-1.2b-thinking:free">liquid/lfm-2.5-1.2b-thinking:free</SelectItem>
                <SelectItem value="anthropic/claude-3.5-sonnet">anthropic/claude-3.5-sonnet</SelectItem>
                <SelectItem value="openrouter/auto">openrouter/auto</SelectItem>
                <SelectItem value="custom">custom</SelectItem>
              </SelectContent>
            </Select>
            {model === "custom" && (
              <Input
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Custom model name"
                className="mt-2"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={testLlmConnection} disabled={llmTestStatus === "testing"}>
              {llmTestStatus === "testing" ? "Testing..." : "Test Connection"}
            </Button>
            {llmTestStatus === "success" && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>
            )}
            {llmTestStatus === "error" && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>
            )}
          </div>

          <Separator />

          <Button onClick={handleSave}>
            {saveStatus === "saved" ? "Saved" : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database</CardTitle>
          <CardDescription>Database connection settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge
              className={
                dbStatus === "connected"
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : dbStatus === "not-configured"
                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  : dbStatus === "error"
                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : "bg-muted text-muted-foreground"
              }
            >
              {dbStatus === "connected"
                ? "Connected"
                : dbStatus === "not-configured"
                ? "Not configured"
                : dbStatus === "error"
                ? "Error"
                : dbStatus === "testing"
                ? "Checking..."
                : "Unknown"}
            </Badge>

            <Button variant="outline" size="sm" onClick={checkDbConnection} disabled={dbStatus === "testing"}>
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Browser</CardTitle>
          <CardDescription>CloakBrowser manages its own browser</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge
              className={
                browserStatus === "ok"
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : browserStatus === "error"
                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : browserStatus === "checking"
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-muted text-muted-foreground"
              }
            >
              {browserStatus === "ok"
                ? "Running"
                : browserStatus === "error"
                ? "Not available"
                : browserStatus === "checking"
                ? "Checking..."
                : "Unknown"}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={checkBrowser}
            disabled={browserStatus === "checking"}
          >
            Check Status
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Application information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span className="font-mono">0.1.0</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Platform</span>
            <span className="font-mono">{electronAPI.app.getPlatform()}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Theme</span>
            <Badge variant="secondary">Light</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}