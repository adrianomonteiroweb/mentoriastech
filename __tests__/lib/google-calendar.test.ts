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
  },
}))

import {
  getConsentUrl,
  exchangeCodeForTokens,
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google-calendar"

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

  it("should include calendar.events scope", () => {
    getConsentUrl("http://localhost/callback")
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: expect.arrayContaining(["https://www.googleapis.com/auth/calendar.events"]),
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
    process.env.GOOGLE_CALENDAR_ID = "mentor@gmail.com"
    process.env.GOOGLE_REFRESH_TOKEN = "valid-refresh-token"
  })

  const baseParams = {
    summary: "Mentoria: Next.js",
    description: "Mentoria com João\nTema: Next.js",
    date: "2026-04-15",
    time: "14:00",
  }

  it("should return null when GOOGLE_REFRESH_TOKEN is not set", async () => {
    delete process.env.GOOGLE_REFRESH_TOKEN
    const result = await createCalendarEvent(baseParams)
    expect(result).toBeNull()
    expect(mockEventsInsert).not.toHaveBeenCalled()
  })

  it("should set credentials with refresh token", async () => {
    await createCalendarEvent(baseParams)
    expect(mockSetCredentials).toHaveBeenCalledWith({ refresh_token: "valid-refresh-token" })
  })

  it("should call events.insert with correct calendarId", async () => {
    await createCalendarEvent(baseParams)
    expect(mockEventsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: "mentor@gmail.com",
      }),
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

  it("should add attendeeEmail when provided", async () => {
    await createCalendarEvent({ ...baseParams, attendeeEmail: "joao@test.com" })
    const call = mockEventsInsert.mock.calls[0][0]
    const emails = call.requestBody.attendees.map((a: { email: string }) => a.email)
    expect(emails).toContain("joao@test.com")
    expect(emails).toContain("mentor@gmail.com")
  })

  it("should only include mentor when no attendeeEmail", async () => {
    await createCalendarEvent(baseParams)
    const call = mockEventsInsert.mock.calls[0][0]
    expect(call.requestBody.attendees).toHaveLength(1)
    expect(call.requestBody.attendees[0].email).toBe("mentor@gmail.com")
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
    expect(result).toBe("event-123")
  })
})

describe("deleteCalendarEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret"
    process.env.GOOGLE_CALENDAR_ID = "mentor@gmail.com"
    process.env.GOOGLE_REFRESH_TOKEN = "valid-refresh-token"
  })

  it("should not call API when refresh_token is missing", async () => {
    delete process.env.GOOGLE_REFRESH_TOKEN
    await deleteCalendarEvent("event-123")
    expect(mockEventsDelete).not.toHaveBeenCalled()
  })

  it("should call events.delete with correct params", async () => {
    await deleteCalendarEvent("event-456")
    expect(mockEventsDelete).toHaveBeenCalledWith({
      calendarId: "mentor@gmail.com",
      eventId: "event-456",
    })
  })

  it("should not throw when delete fails", async () => {
    mockEventsDelete.mockRejectedValueOnce(new Error("Not found"))
    await expect(deleteCalendarEvent("event-789")).resolves.toBeUndefined()
  })
})
