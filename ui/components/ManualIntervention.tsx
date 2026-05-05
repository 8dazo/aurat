"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface ManualInterventionProps {
  isPaused: boolean
  pauseReason: string
  isQuestion?: boolean
  question?: string
  isPresubmitReview?: boolean
  onSubmitAnswer?: (answer: string) => void
  onResume: () => void
}

export function ManualIntervention({
  isPaused,
  pauseReason,
  isQuestion = false,
  question,
  isPresubmitReview = false,
  onSubmitAnswer,
  onResume,
}: ManualInterventionProps) {
  const [answer, setAnswer] = useState("")

  if (!isPaused) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              Paused
            </Badge>
          </div>
          <CardTitle>Manual Intervention Required</CardTitle>
          <CardDescription>{pauseReason}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isQuestion && question && (
            <div className="space-y-3">
              <p className="text-sm font-medium">{question}</p>
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
              />
              <Button
                className="w-full"
                onClick={() => {
                  if (answer.trim() && onSubmitAnswer) {
                    onSubmitAnswer(answer.trim())
                    setAnswer("")
                  }
                }}
                disabled={!answer.trim()}
              >
                Submit Answer
              </Button>
            </div>
          )}

          {isPresubmitReview && (
            <Button
              className="w-full"
              onClick={() => {
                if (onSubmitAnswer) onSubmitAnswer("__review_complete__")
              }}
            >
              Review Complete - Submit
            </Button>
          )}
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button variant="outline" onClick={onResume}>
            Resume
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}