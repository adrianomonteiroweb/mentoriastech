import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

import { middleware } from "@/middleware"

function makeRequest(
  url: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
) {
  return new NextRequest(url, init)
}

describe("middleware security hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key"
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
  })

  it("rejects cross-site API mutations", async () => {
    const response = await middleware(
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
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it("allows same-origin API mutations and keeps security headers", async () => {
    const response = await middleware(
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
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it("does not trust the legacy session cookie for protected routes", async () => {
    const response = await middleware(
      makeRequest("https://app.test/admin", {
        headers: {
          cookie: "session_id=legacy-session",
        },
      }),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain(
      "/login?redirect=%2Fadmin",
    )
    expect(mockGetUser).toHaveBeenCalledTimes(1)
  })

  it("allows protected routes only when Supabase validates the user", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1", email: "maria@test.com" } },
      error: null,
    })

    const response = await middleware(makeRequest("https://app.test/dashboard"))

    expect(response.status).toBe(200)
    expect(response.headers.get("X-Frame-Options")).toBe("DENY")
    expect(mockGetUser).toHaveBeenCalledTimes(1)
  })

  it("treats an expired Supabase session as unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("JWT expired"),
    })

    const response = await middleware(makeRequest("https://app.test/mentee"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain(
      "/login?redirect=%2Fmentee",
    )
  })

  it("redirects authenticated users away from auth pages", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-1", email: "maria@test.com" } },
      error: null,
    })

    const response = await middleware(makeRequest("https://app.test/login"))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("https://app.test/dashboard")
  })
})
