// Helper de tracking para páginas públicas (visitas e clicks).
// Dispara um beacon para /api/track/page sem nunca quebrar a UX.

export type PageEventType = "visit" | "click"

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
      }),
      keepalive: true,
    })
  } catch {
    // silencioso — tracking é best-effort
  }
}
