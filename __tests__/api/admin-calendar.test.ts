import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Hoisted mocks ---
const {
  mockRequireMentorAccess,
  mockGetMentorId,
  mockGetConsentUrl,
  mockExchangeCodeForTokens,
  mockGetConnectedEmail,
  mockCreateCalendarEvent,
  mockIsMentorCalendarConnected,
  mockInsertValues,
  mockOnConflictDoUpdate,
  mockDeleteWhere,
  mockSelectLimit,
} = vi.hoisted(() => ({
  mockRequireMentorAccess: vi.fn().mockResolvedValue({ id: "mentor-1", role: "admin" }),
  mockGetMentorId: vi.fn((profile: { id: string }) => profile.id),
  mockGetConsentUrl: vi.fn().mockReturnValue("https://accounts.google.com/consent?test=1"),
  mockExchangeCodeForTokens: vi.fn().mockResolvedValue({
    refresh_token: "mock-refresh-token",
    access_token: "mock-access-token",
  }),
  mockGetConnectedEmail: vi.fn().mockResolvedValue("mentor@gmail.com"),
  mockCreateCalendarEvent: vi.fn().mockResolvedValue({
    eventId: "event-new-123",
    meetLink: "https://meet.google.com/test",
  }),
  mockIsMentorCalendarConnected: vi.fn().mockResolvedValue(false),
  mockInsertValues: vi.fn(),
  mockOnConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  mockDeleteWhere: vi.fn().mockResolvedValue(undefined),
  mockSelectLimit: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/lib/utils/auth", () => ({
  requireMentorAccess: mockRequireMentorAccess,
  getMentorId: mockGetMentorId,
}))

vi.mock("@/lib/google-calendar", () => ({
  getConsentUrl: mockGetConsentUrl,
  exchangeCodeForTokens: mockExchangeCodeForTokens,
  getConnectedEmail: mockGetConnectedEmail,
  createCalendarEvent: mockCreateCalendarEvent,
  isMentorCalendarConnected: mockIsMentorCalendarConnected,
  googleCalendarSettingKey: (mentorId: string) => `google_calendar:${mentorId}`,
  getCalendarRedirectUri: (origin: string) => `${origin}/api/admin/calendar/auth`,
}))

vi.mock("@/lib/db", () => {
  const sitePrivateSettings = { key: "site_private_settings.key" }
  const siteSettings = { key: "site_settings.key" }

  mockInsertValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate })

  const db = {
    insert: vi.fn(() => ({ values: mockInsertValues })),
    delete: vi.fn(() => ({ where: mockDeleteWhere })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: mockSelectLimit })),
      })),
    })),
  }

  return { db, sitePrivateSettings, siteSettings }
})

// Import route handlers
import { GET as AuthGET, POST as AuthPOST, DELETE as AuthDELETE } from "@/app/api/admin/calendar/auth/route"
import { GET as StatusGET } from "@/app/api/admin/calendar/status/route"
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

describe("GET /api/admin/calendar/auth (consent)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireMentorAccess.mockResolvedValue({ id: "mentor-1", role: "admin" })
  })

  it("should return consent URL when no code is present", async () => {
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
    mockRequireMentorAccess.mockRejectedValueOnce(
      Object.assign(new Error("Nao autenticado"), { status: 401 }),
    )

    const res = await AuthGET(makeGetRequest())
    expect(res.status).toBe(401)
  })
})

describe("GET /api/admin/calendar/auth (OAuth callback)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireMentorAccess.mockResolvedValue({ id: "mentor-1", role: "admin" })
  })

  it("should exchange code, store per-mentor token and redirect to admin settings", async () => {
    const res = await AuthGET(
      makeGetRequest("http://localhost/api/admin/calendar/auth?code=auth-code-123"),
    )

    expect(mockExchangeCodeForTokens).toHaveBeenCalledWith(
      "auth-code-123",
      "http://localhost/api/admin/calendar/auth",
    )
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "google_calendar:mentor-1",
        value: expect.objectContaining({
          refresh_token: "mock-refresh-token",
          calendar_email: "mentor@gmail.com",
        }),
      }),
    )
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get("location")).toContain("/admin/settings?calendar=connected")
  })

  it("should redirect mentors to /mentor/settings", async () => {
    mockRequireMentorAccess.mockResolvedValueOnce({ id: "mentor-2", role: "mentor" })

    const res = await AuthGET(
      makeGetRequest("http://localhost/api/admin/calendar/auth?code=abc"),
    )

    expect(res.headers.get("location")).toContain("/mentor/settings?calendar=connected")
  })

  it("should redirect with error when no refresh_token returned", async () => {
    mockExchangeCodeForTokens.mockResolvedValueOnce({ access_token: "only" })

    const res = await AuthGET(
      makeGetRequest("http://localhost/api/admin/calendar/auth?code=abc"),
    )

    expect(res.headers.get("location")).toContain("calendar=norefresh")
  })
})

describe("POST /api/admin/calendar/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireMentorAccess.mockResolvedValue({ id: "mentor-1", role: "admin" })
  })

  it("should exchange code, store per-mentor token and return success", async () => {
    const res = await AuthPOST(
      makePostRequest("http://localhost/api/admin/calendar/auth", { code: "auth-code-123" }),
    )
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "google_calendar:mentor-1",
        value: expect.objectContaining({ refresh_token: "mock-refresh-token" }),
      }),
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

  it("should return 401 if not authenticated", async () => {
    mockRequireMentorAccess.mockRejectedValueOnce(
      Object.assign(new Error("Nao autenticado"), { status: 401 }),
    )

    const res = await AuthPOST(
      makePostRequest("http://localhost/api/admin/calendar/auth", { code: "code" }),
    )
    expect(res.status).toBe(401)
  })
})

describe("DELETE /api/admin/calendar/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireMentorAccess.mockResolvedValue({ id: "mentor-1", role: "admin" })
  })

  it("should disconnect and return success", async () => {
    const res = await AuthDELETE(
      new Request("http://localhost/api/admin/calendar/auth", { method: "DELETE" }),
    )
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mockDeleteWhere).toHaveBeenCalled()
  })
})

describe("GET /api/admin/calendar/status", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireMentorAccess.mockResolvedValue({ id: "mentor-1", role: "admin" })
  })

  it("should report connected with email when a per-mentor token exists", async () => {
    mockSelectLimit.mockResolvedValueOnce([
      {
        value: {
          refresh_token: "tok",
          calendar_email: "mentor@gmail.com",
          connected_at: "2026-01-01T00:00:00.000Z",
        },
      },
    ])

    const res = await StatusGET(new Request("http://localhost/api/admin/calendar/status"))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toMatchObject({ connected: true, email: "mentor@gmail.com" })
  })

  it("should fall back to isMentorCalendarConnected when no per-mentor token", async () => {
    mockSelectLimit.mockResolvedValueOnce([])
    mockIsMentorCalendarConnected.mockResolvedValueOnce(false)

    const res = await StatusGET(new Request("http://localhost/api/admin/calendar/status"))
    const data = await res.json()
    expect(data).toMatchObject({ connected: false, email: null })
  })
})

describe("POST /api/admin/calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireMentorAccess.mockResolvedValue({ id: "mentor-1", role: "admin" })
  })

  it("should create calendar event with mentorId and return eventId", async () => {
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
    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({ mentorId: "mentor-1" }),
    )
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
      expect.objectContaining({ attendeeEmail: "mentee@test.com" }),
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
