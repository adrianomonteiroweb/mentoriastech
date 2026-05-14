import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Hoisted mocks ---
const {
  mockRequireRole,
  mockGetConsentUrl,
  mockExchangeCodeForTokens,
  mockCreateCalendarEvent,
  mockUpsert,
} = vi.hoisted(() => ({
  mockRequireRole: vi.fn().mockResolvedValue(undefined),
  mockGetConsentUrl: vi.fn().mockReturnValue("https://accounts.google.com/consent?test=1"),
  mockExchangeCodeForTokens: vi.fn().mockResolvedValue({
    refresh_token: "mock-refresh-token",
    access_token: "mock-access-token",
  }),
  mockCreateCalendarEvent: vi.fn().mockResolvedValue("event-new-123"),
  mockUpsert: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock("@/lib/utils/auth", () => ({
  requireRole: mockRequireRole,
}))

vi.mock("@/lib/google-calendar", () => ({
  getConsentUrl: mockGetConsentUrl,
  exchangeCodeForTokens: mockExchangeCodeForTokens,
  createCalendarEvent: mockCreateCalendarEvent,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: mockUpsert,
    })),
  })),
}))

// Import route handlers
import { GET as AuthGET, POST as AuthPOST } from "@/app/api/admin/calendar/auth/route"
import { POST as CalendarPOST } from "@/app/api/admin/calendar/route"

function makeGetRequest(url = "http://localhost/api/admin/calendar/auth") {
  return new Request(url, { method: "GET" })
}

function makePostRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("GET /api/admin/calendar/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return consent URL", async () => {
    const res = await AuthGET(makeGetRequest())
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.url).toBe("https://accounts.google.com/consent?test=1")
  })

  it("should call getConsentUrl with correct redirectUri", async () => {
    await AuthGET(makeGetRequest("http://localhost:3000/api/admin/calendar/auth"))

    expect(mockGetConsentUrl).toHaveBeenCalledWith(
      "http://localhost:3000/api/admin/calendar/auth",
    )
  })

  it("should return 401 if not authenticated", async () => {
    mockRequireRole.mockRejectedValueOnce(Object.assign(new Error("Nao autenticado"), { status: 401 }))

    const res = await AuthGET(makeGetRequest())
    expect(res.status).toBe(401)
  })
})

describe("POST /api/admin/calendar/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should exchange code for tokens and return success", async () => {
    const res = await AuthPOST(
      makePostRequest("http://localhost/api/admin/calendar/auth", { code: "auth-code-123" }),
    )
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it("should call exchangeCodeForTokens with code and redirectUri", async () => {
    await AuthPOST(
      makePostRequest("http://localhost:3000/api/admin/calendar/auth", { code: "auth-code-456" }),
    )

    expect(mockExchangeCodeForTokens).toHaveBeenCalledWith(
      "auth-code-456",
      "http://localhost:3000/api/admin/calendar/auth",
    )
  })

  it("should save refresh_token to site_settings", async () => {
    await AuthPOST(
      makePostRequest("http://localhost/api/admin/calendar/auth", { code: "auth-code-789" }),
    )

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "google_calendar",
        value: expect.objectContaining({
          refresh_token: "mock-refresh-token",
        }),
      }),
      { onConflict: "key" },
    )
  })

  it("should return 400 if code is missing", async () => {
    const res = await AuthPOST(
      makePostRequest("http://localhost/api/admin/calendar/auth", {}),
    )
    expect(res.status).toBe(400)

    const data = await res.json()
    expect(data.error).toContain("obrigatorio")
  })

  it("should return 400 if no refresh_token returned", async () => {
    mockExchangeCodeForTokens.mockResolvedValueOnce({
      access_token: "access-only",
      refresh_token: null,
    })

    const res = await AuthPOST(
      makePostRequest("http://localhost/api/admin/calendar/auth", { code: "auth-code" }),
    )
    expect(res.status).toBe(400)

    const data = await res.json()
    expect(data.error).toContain("refresh_token")
  })

  it("should return 401 if not admin", async () => {
    mockRequireRole.mockRejectedValueOnce(Object.assign(new Error("Nao autenticado"), { status: 401 }))

    const res = await AuthPOST(
      makePostRequest("http://localhost/api/admin/calendar/auth", { code: "code" }),
    )
    expect(res.status).toBe(401)
  })
})

describe("POST /api/admin/calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should create calendar event and return eventId", async () => {
    const res = await CalendarPOST(
      makePostRequest("http://localhost/api/admin/calendar", {
        summary: "Mentoria: React",
        description: "Mentoria com João",
        date: "2026-04-20",
        time: "10:00",
      }),
    )
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.eventId).toBe("event-new-123")
  })

  it("should pass attendeeEmail to createCalendarEvent", async () => {
    await CalendarPOST(
      makePostRequest("http://localhost/api/admin/calendar", {
        summary: "Mentoria: React",
        description: "Desc",
        date: "2026-04-20",
        time: "10:00",
        attendeeEmail: "mentee@test.com",
      }),
    )

    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        attendeeEmail: "mentee@test.com",
      }),
    )
  })

  it("should return 400 if Calendar is not configured", async () => {
    mockCreateCalendarEvent.mockResolvedValueOnce(null)

    const res = await CalendarPOST(
      makePostRequest("http://localhost/api/admin/calendar", {
        summary: "Mentoria",
        description: "Desc",
        date: "2026-04-20",
        time: "10:00",
      }),
    )
    expect(res.status).toBe(400)

    const data = await res.json()
    expect(data.error).toContain("Calendar")
  })

  it("should return 400 for invalid data", async () => {
    const res = await CalendarPOST(
      makePostRequest("http://localhost/api/admin/calendar", {
        summary: "Mentoria",
        // missing required fields
      }),
    )
    expect(res.status).toBe(400)
  })

  it("should return 500 if createCalendarEvent throws", async () => {
    mockCreateCalendarEvent.mockRejectedValueOnce(new Error("API Error"))

    const res = await CalendarPOST(
      makePostRequest("http://localhost/api/admin/calendar", {
        summary: "Mentoria",
        description: "Desc",
        date: "2026-04-20",
        time: "10:00",
      }),
    )
    expect(res.status).toBe(500)
  })
})
