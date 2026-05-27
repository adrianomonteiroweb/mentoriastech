import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

import { middleware } from "@/middleware"

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(url, init)
}

describe("middleware security hardening", () => {
  it("rejects cross-site API mutations", async () => {
    const response = middleware(
      makeRequest("https://app.test/api/admin/bookings/history-sync", {
        method: "POST",
        headers: {
          origin: "https://evil.test",
          "sec-fetch-site": "cross-site",
        },
      }),
    )

    expect(response.status).toBe(403)
    expect(response.headers.get("X-Frame-Options")).toBe("DENY")
    await expect(response.json()).resolves.toEqual({
      error: "Origem nao autorizada",
    })
  })

  it("allows same-origin API mutations and keeps security headers", () => {
    const response = middleware(
      makeRequest("https://app.test/api/admin/bookings/history-sync", {
        method: "POST",
        headers: {
          origin: "https://app.test",
          "sec-fetch-site": "same-origin",
        },
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    )
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
  })
})
