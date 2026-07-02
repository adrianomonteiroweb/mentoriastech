"use client"

import { useEffect } from "react"
import { trackPageEvent } from "@/lib/track-page"

interface ToolViewTrackerProps {
  tool: string
}

export function ToolViewTracker({ tool }: ToolViewTrackerProps) {
  useEffect(() => {
    const key = `tool_view_tracked:${tool}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, "1")
    } catch {
      // sessionStorage indisponível — segue e registra
    }
    trackPageEvent("tool_view", tool)
  }, [tool])

  return null
}
