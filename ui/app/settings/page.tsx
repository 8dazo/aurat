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

type ModelOption = "gpt-oss:120b-cloud" | "gpt-oss" | "custom"

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [model, setModel] = useState<ModelOption>("gpt-oss:120b-cloud")
  const [customModel, setCustomModel] = useState("")
  const [llmTestStatus, setLlmTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")

  const [dbConfigured, setDbConfigured] = useState(false)
  const [dbStatus, setDbStatus] = useState<"unknown" | "connected" | "not-configured" | "testing" | "error">("unknown")

  const [pwStatus, setPwStatus] = useState<"unknown" | "installed" | "not-installed" | "installing" | "checking">("unknown")
  const [browserVersion, setBrowserVersion] = useState<string | null>(null)

  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle")

  useEffect(() => {
    const stored = localStorage.getItem("aurat-settings")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.apiKey) setApiKey(parsed.apiKey)
        if (parsed.model) setModel(parsed.model)
        if (parsed.customModel) setCustomModel(parsed.customModel)
      } catch {}
    }

    checkDbConnection()
    checkPlaywright()
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
      setDbStatus("error")
    }
  }

  async function checkPlaywright() {
    setPwStatus("checking")
    try {
      const result = await electronAPI.python.request("/health")
      if (result && typeof result === "object" && (result as Record<string, unknown>).browser) {
        setPwStatus("installed")
        setBrowserVersion((result as Record<string, unknown>).browser as string)
      } else {
        setPwStatus("not-installed")
      }
    } catch {
      setPwStatus("not-installed")
    }
  }

  async function installChromium() {
    setPwStatus("installing")
    try {
      await electronAPI.python.request("/install-browser")
      await checkPlaywright()
    } catch {
      setPwStatus("not-installed")
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
          <CardTitle>LLM Configuration</CardTitle>
          <CardDescription>Set up your language model connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">OLLAMA_API_KEY</Label>
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
                <SelectItem value="gpt-oss:120b-cloud">gpt-oss:120b-cloud</SelectItem>
                <SelectItem value="gpt-oss">gpt-oss (local)</SelectItem>
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
          <CardTitle>Playwright Browser</CardTitle>
          <CardDescription>Browser engine for automated interactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge
              className={
                pwStatus === "installed"
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : pwStatus === "not-installed"
                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : pwStatus === "installing"
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "bg-muted text-muted-foreground"
              }
            >
              {pwStatus === "installed"
                ? "Installed"
                : pwStatus === "not-installed"
                ? "Not installed"
                : pwStatus === "installing"
                ? "Installing..."
                : pwStatus === "checking"
                ? "Checking..."
                : "Unknown"}
            </Badge>

            {pwStatus === "installed" && browserVersion && (
              <span className="text-xs text-muted-foreground">{browserVersion}</span>
            )}
          </div>

          {(pwStatus === "not-installed" || pwStatus === "installing") && (
            <div className="space-y-3">
              {pwStatus === "not-installed" && (
                <Button onClick={installChromium}>Install Chromium</Button>
              )}
              {pwStatus === "installing" && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
                </div>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={checkPlaywright}
            disabled={pwStatus === "checking" || pwStatus === "installing"}
          >
            Check Installation
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
            <Badge variant="secondary">Dark (always on)</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}