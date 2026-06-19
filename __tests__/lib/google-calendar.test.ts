import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock googleapis
const mockGenerateAuthUrl = vi.fn().mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?test=1")
const mockGetToken = vi.fn().mockResolvedValue({
  tokens: { refresh_token: "mock-refresh-token", access_token: "mock-access" },
})
const mockSetCredentials = vi.fn()
const mockEventsInsert = vi.fn().mockResolvedValue({ data: { id: "event-123" } })
const mockEventsDelete = vi.fn().mockResolvedValue({})

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        generateAuthUrl: mockGenerateAuthUrl,
        getToken: mockGetToken,
        setCredentials: mockSetCredentials,
        set redirectUri(val: string) {
          // no-op setter
        },
      })),
    },
    calendar: vi.fn(() => ({
      events: {
        insert: mockEventsInsert,
        delete: mockEventsDelete,
      },
    })),
    oauth2: vi.fn(() => ({
      userinfo: { get: vi.fn().mockResolvedValue({ data: { email: "mentor@gmail.com" } }) },
    })),
  },
}))

// Controla o resultado das leituras de site_private_settings.
const { mockLimit, mockGetDefaultMentorId } = vi.hoisted(() => ({
  mockLimit: vi.fn().mockResolvedValue([]),
  mockGetDefaultMentorId: vi.fn().mockResolvedValue("admin-default"),
}))

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: mockLimit,
        })),
      })),
    })),
  },
  sitePrivateSettings: { key: "site_private_settings.key" },
  siteSettings: { key: "site_settings.key" },
}))

vi.mock("@/lib/utils/auth", () => ({
  getDefaultMentorId: mockGetDefaultMentorId,
}))

import {
  getConsentUrl,
  getCalendarRedirectUri,
  exchangeCodeForTokens,
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google-calendar"

const PER_MENTOR_TOKEN_ROW = [
  { value: { refresh_token: "valid-refresh-token", calendar_email: "mentor@gmail.com" } },
]

describe("getConsentUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
  })

  it("should return a URL string", () => {
    const url = getConsentUrl("http://localhost/callback")
    expect(url).toBe("https://accounts.google.com/o/oauth2/v2/auth?test=1")
  })

  it("should call generateAuthUrl with offline access_type", () => {
    getConsentUrl("http://localhost/callback")
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        access_type: "offline",
        prompt: "consent",
      }),
    )
  })

  it("should include calendar.events and email scopes", () => {
    getConsentUrl("http://localhost/callback")
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: expect.arrayContaining([
          "https://www.googleapis.com/auth/calendar.events",
          "email",
        ]),
      }),
    )
  })

  it("should throw if GOOGLE_CLIENT_ID is missing", () => {
    delete process.env.GOOGLE_CLIENT_ID
    expect(() => getConsentUrl("http://localhost/callback")).toThrow("credentials not configured")
  })

  it("should throw if GOOGLE_CLIENT_SECRET is missing", () => {
    delete process.env.GOOGLE_CLIENT_SECRET
    expect(() => getConsentUrl("http://localhost/callback")).toThrow("credentials not configured")
  })
})

describe("getCalendarRedirectUri", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.GOOGLE_REDIRECT_URI
  })

  it("falls back to the request origin when GOOGLE_REDIRECT_URI is not set", () => {
    expect(getCalendarRedirectUri("https://app.exemplo.com")).toBe(
      "https://app.exemplo.com/api/admin/calendar/auth",
    )
  })

  it("prefers the explicit GOOGLE_REDIRECT_URI env when set", () => {
    process.env.GOOGLE_REDIRECT_URI = "https://prod.exemplo.com/api/admin/calendar/auth"
    expect(getCalendarRedirectUri("http://localhost:3000")).toBe(
      "https://prod.exemplo.com/api/admin/calendar/auth",
    )
  })
})

describe("exchangeCodeForTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
  })

  it("should return tokens from Google", async () => {
    const tokens = await exchangeCodeForTokens("auth-code", "http://localhost/callback")
    expect(tokens).toEqual({ refresh_token: "mock-refresh-token", access_token: "mock-access" })
  })

  it("should call getToken with the authorization code", async () => {
    await exchangeCodeForTokens("auth-code-123", "http://localhost/callback")
    expect(mockGetToken).toHaveBeenCalledWith("auth-code-123")
  })
})

describe("createCalendarEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    delete process.env.GOOGLE_REFRESH_TOKEN
    mockLimit.mockResolvedValue(PER_MENTOR_TOKEN_ROW)
    mockGetDefaultMentorId.mockResolvedValue("admin-default")
  })

  const baseParams = {
    mentorId: "mentor-1",
    summary: "Mentoria: Next.js",
    description: "Mentoria com João\nTema: Next.js",
    date: "2026-04-15",
    time: "14:00",
  }

  it("should return null when the mentor has no calendar connected", async () => {
    mockLimit.mockResolvedValueOnce([]) // sem chave por mentor
    const result = await createCalendarEvent(baseParams) // mentor-1 != admin-default
    expect(result).toBeNull()
    expect(mockEventsInsert).not.toHaveBeenCalled()
  })

  it("should use the per-mentor refresh token", async () => {
    await createCalendarEvent(baseParams)
    expect(mockSetCredentials).toHaveBeenCalledWith({ refresh_token: "valid-refresh-token" })
  })

  it("should fall back to env token for the default admin mentor", async () => {
    mockLimit.mockResolvedValueOnce([]) // sem chave por mentor
    mockGetDefaultMentorId.mockResolvedValueOnce("mentor-1")
    process.env.GOOGLE_REFRESH_TOKEN = "env-refresh-token"

    const result = await createCalendarEvent(baseParams)
    expect(mockSetCredentials).toHaveBeenCalledWith({ refresh_token: "env-refresh-token" })
    expect(result).toEqual({ eventId: "event-123", meetLink: null })
  })

  it("should write to the primary calendar", async () => {
    await createCalendarEvent(baseParams)
    expect(mockEventsInsert).toHaveBeenCalledWith(
      expect.objectContaining({ calendarId: "primary" }),
    )
  })

  it("should include summary and description in request body", async () => {
    await createCalendarEvent(baseParams)
    const call = mockEventsInsert.mock.calls[0][0]
    expect(call.requestBody.summary).toBe("Mentoria: Next.js")
    expect(call.requestBody.description).toContain("João")
  })

  it("should set timezone to America/Fortaleza", async () => {
    await createCalendarEvent(baseParams)
    const call = mockEventsInsert.mock.calls[0][0]
    expect(call.requestBody.start.timeZone).toBe("America/Fortaleza")
    expect(call.requestBody.end.timeZone).toBe("America/Fortaleza")
  })

  it("should create hangoutsMeet conference", async () => {
    await createCalendarEvent(baseParams)
    const call = mockEventsInsert.mock.calls[0][0]
    expect(call.requestBody.conferenceData.createRequest.conferenceSolutionKey.type).toBe("hangoutsMeet")
    expect(call.conferenceDataVersion).toBe(1)
  })

  it("should set reminders: email 60min and popup 15min", async () => {
    await createCalendarEvent(baseParams)
    const call = mockEventsInsert.mock.calls[0][0]
    expect(call.requestBody.reminders.useDefault).toBe(false)
    expect(call.requestBody.reminders.overrides).toEqual([
      { method: "email", minutes: 60 },
      { method: "popup", minutes: 15 },
    ])
  })

  it("should add only the mentee as attendee when provided", async () => {
    await createCalendarEvent({ ...baseParams, attendeeEmail: "joao@test.com" })
    const call = mockEventsInsert.mock.calls[0][0]
    const emails = call.requestBody.attendees.map((a: { email: string }) => a.email)
    expect(emails).toEqual(["joao@test.com"])
  })

  it("should have no attendees when no attendeeEmail", async () => {
    await createCalendarEvent(baseParams)
    const call = mockEventsInsert.mock.calls[0][0]
    expect(call.requestBody.attendees).toHaveLength(0)
  })

  it("should use default 60 minute duration", async () => {
    await createCalendarEvent(baseParams)
    const call = mockEventsInsert.mock.calls[0][0]
    const start = new Date(call.requestBody.start.dateTime)
    const end = new Date(call.requestBody.end.dateTime)
    const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
    expect(diffMinutes).toBe(60)
  })

  it("should use custom duration when provided", async () => {
    await createCalendarEvent({ ...baseParams, durationMinutes: 90 })
    const call = mockEventsInsert.mock.calls[0][0]
    const start = new Date(call.requestBody.start.dateTime)
    const end = new Date(call.requestBody.end.dateTime)
    const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
    expect(diffMinutes).toBe(90)
  })

  it("should return eventId from response", async () => {
    const result = await createCalendarEvent(baseParams)
    expect(result).toEqual({ eventId: "event-123", meetLink: null })
  })
})

describe("deleteCalendarEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    delete process.env.GOOGLE_REFRESH_TOKEN
    mockLimit.mockResolvedValue(PER_MENTOR_TOKEN_ROW)
    mockGetDefaultMentorId.mockResolvedValue("admin-default")
  })

  it("should not call API when the mentor has no calendar connected", async () => {
    mockLimit.mockResolvedValueOnce([])
    await deleteCalendarEvent({ mentorId: "mentor-1", eventId: "event-123" })
    expect(mockEventsDelete).not.toHaveBeenCalled()
  })

  it("should call events.delete with the primary calendar", async () => {
    await deleteCalendarEvent({ mentorId: "mentor-1", eventId: "event-456" })
    expect(mockEventsDelete).toHaveBeenCalledWith({
      calendarId: "primary",
      eventId: "event-456",
    })
  })

  it("should not throw when delete fails", async () => {
    mockEventsDelete.mockRejectedValueOnce(new Error("Not found"))
    await expect(
      deleteCalendarEvent({ mentorId: "mentor-1", eventId: "event-789" }),
    ).resolves.toBeUndefined()
  })
})
