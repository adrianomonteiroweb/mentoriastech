export type PageEventType = "visit" | "click" | "tool_view"

function getUtmParams(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  if (typeof window === "undefined") return {}
  const params = new URLSearchParams(window.location.search)
  const source = params.get("utm_source")
  const medium = params.get("utm_medium")
  const campaign = params.get("utm_campaign")
  return {
    ...(source && { utm_source: source }),
    ...(medium && { utm_medium: medium }),
    ...(campaign && { utm_campaign: campaign }),
  }
}

export async function trackPageEvent(
  event: PageEventType,
  target?: string,
  path?: string,
): Promise<void> {
  try {
    await fetch("/api/track/page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        path: path ?? (typeof window !== "undefined" ? window.location.pathname : "/"),
        target,
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
        ...getUtmParams(),
      }),
      keepalive: true,
    })
  } catch {
    // silencioso — tracking é best-effort
  }
}
