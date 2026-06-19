import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Hoisted mocks ---
const {
  mockRequireMentorAccess,
  mockGetMentorId,
  mockLimit,
  mockReturning,
  mockHasBookingConflict,
  mockCreateCalendarEvent,
  mockDeleteCalendarEvent,
  mockSendMail,
  mockBookingConfirmedEmail,
  mockBookingPaymentPendingEmail,
  mockBookingScheduledEmail,
  mockBookingCompletedEmail,
  mockBookingCancelledEmail,
} = vi.hoisted(() => ({
  mockRequireMentorAccess: vi.fn().mockResolvedValue({ id: "mentor-1", role: "admin" }),
  mockGetMentorId: vi.fn((profile: { id: string }) => profile.id),
  mockLimit: vi.fn(),
  mockReturning: vi.fn(),
  mockHasBookingConflict: vi.fn().mockResolvedValue(false),
  mockCreateCalendarEvent: vi.fn().mockResolvedValue({ eventId: "gcal-event-id", meetLink: "https://meet.google.com/x" }),
  mockDeleteCalendarEvent: vi.fn().mockResolvedValue(undefined),
  mockSendMail: vi.fn().mockResolvedValue({ messageId: "msg-1" }),
  mockBookingConfirmedEmail: vi.fn().mockReturnValue({ subject: "Confirmada", html: "<p>confirmed</p>" }),
  mockBookingPaymentPendingEmail: vi.fn().mockReturnValue({ subject: "Pagamento", html: "<p>payment</p>" }),
  mockBookingScheduledEmail: vi.fn().mockReturnValue({ subject: "Agendada", html: "<p>scheduled</p>" }),
  mockBookingCompletedEmail: vi.fn().mockReturnValue({ subject: "Concluida", html: "<p>completed</p>" }),
  mockBookingCancelledEmail: vi.fn().mockReturnValue({ subject: "Cancelada", html: "<p>cancelled</p>" }),
}))

vi.mock("@/lib/utils/auth", () => ({
  requireMentorAccess: mockRequireMentorAccess,
  getMentorId: mockGetMentorId,
}))

vi.mock("@/lib/db", () => {
  const tbl = (name: string) => new Proxy({}, { get: (_t, p) => `${name}.${String(p)}` })
  return {
  db: {
    select: vi.fn(() => {
      const builder = {
        from: () => builder,
        leftJoin: () => builder,
        where: () => builder,
        orderBy: () => builder,
        limit: () => mockLimit(),
      }
      return builder
    }),
    update: vi.fn(() => ({
      set: () => ({
        where: () => ({
          returning: () => mockReturning(),
          then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
            Promise.resolve(mockReturning()).then(res, rej),
        }),
      }),
    })),
  },
  bookings: tbl("bookings"),
  profiles: tbl("profiles"),
  mentoringTopics: tbl("mentoringTopics"),
  }
})

vi.mock("@/lib/db/booking-conflicts", () => ({
  hasBookingConflict: mockHasBookingConflict,
  normalizeBookingTime: (t: string) => (t && t.length === 5 ? `${t}:00` : t),
}))

vi.mock("@/lib/db/mappers", () => ({
  toBooking: (x: unknown) => x,
}))

vi.mock("@/lib/google-calendar", () => ({
  createCalendarEvent: mockCreateCalendarEvent,
  deleteCalendarEvent: mockDeleteCalendarEvent,
}))

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}))

vi.mock("@/lib/email-templates", () => ({
  bookingConfirmedEmail: mockBookingConfirmedEmail,
  bookingPaymentPendingEmail: mockBookingPaymentPendingEmail,
  bookingScheduledEmail: mockBookingScheduledEmail,
  bookingCompletedEmail: mockBookingCompletedEmail,
  bookingCancelledEmail: mockBookingCancelledEmail,
}))

import { PUT } from "@/app/api/admin/bookings/[id]/route"

const loadRow = {
  booking: {
    id: "booking-1",
    mentorId: "mentor-1",
    menteeId: "mentee-1",
    status: "pending",
    sessionDate: "2026-04-15",
    startTime: "14:00:00",
    bookingType: "free",
    googleEventId: null,
    guestName: "Maria Teste",
    guestEmail: "maria@test.com",
  },
  topic: { name: "Carreira em programação" },
  profile: { fullName: "Maria Silva", email: "maria.silva@test.com" },
}

const updatedRow = {
  id: "booking-1",
  sessionDate: "2026-04-15",
  startTime: "14:00:00",
  bookingType: "free",
  googleEventId: null,
  googleMeetUrl: null,
}

function makeRequest(id: string, body: Record<string, unknown>) {
  return new Request(`http://localhost/api/admin/bookings/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe("PUT /api/admin/bookings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.SMTP_HOST = "smtp.test.com"
    process.env.SMTP_USER = "user@test.com"
    process.env.SMTP_PASS = "pass123"
    process.env.SMTP_PORT = "587"

    mockRequireMentorAccess.mockResolvedValue({ id: "mentor-1", role: "admin" })
    mockHasBookingConflict.mockResolvedValue(false)
    mockLimit.mockResolvedValue([{ ...loadRow }])
    mockReturning.mockResolvedValue([{ ...updatedRow }])
    mockCreateCalendarEvent.mockResolvedValue({ eventId: "gcal-event-id", meetLink: "https://meet.google.com/x" })
  })

  // --- Auth ---

  it("should return 401 if not authenticated", async () => {
    mockRequireMentorAccess.mockRejectedValueOnce(Object.assign(new Error("Nao autenticado"), { status: 401 }))

    const res = await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))
    expect(res.status).toBe(401)
  })

  it("should return 403 if not authorized", async () => {
    mockRequireMentorAccess.mockRejectedValueOnce(Object.assign(new Error("Acesso negado"), { status: 403 }))

    const res = await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))
    expect(res.status).toBe(403)
  })

  // --- Validation ---

  it("should return 400 for invalid status", async () => {
    const res = await PUT(makeRequest("booking-1", { status: "invalid_status" }), makeParams("booking-1"))
    expect(res.status).toBe(400)
  })

  // --- Booking fetch ---

  it("should return 404 if booking not found", async () => {
    mockLimit.mockResolvedValueOnce([])

    const res = await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))
    expect(res.status).toBe(404)
  })

  // --- Status: confirmed ---

  it("should update booking status to confirmed", async () => {
    const res = await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))
    expect(res.status).toBe(200)
  })

  it("should send confirmed email to mentee", async () => {
    await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))

    expect(mockBookingConfirmedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        menteeName: "Maria Silva",
        topicName: "Carreira em programação",
      }),
    )
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "maria.silva@test.com",
        subject: "Confirmada",
      }),
    )
  })

  // --- Status: payment_pending ---

  it("should call payment pending email template", async () => {
    await PUT(makeRequest("booking-1", { status: "payment_pending" }), makeParams("booking-1"))

    expect(mockBookingPaymentPendingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        menteeName: "Maria Silva",
        topicName: "Carreira em programação",
      }),
    )
  })

  // --- Status: scheduled (Google Calendar) ---

  it("should create Google Calendar event with mentorId when status is scheduled", async () => {
    await PUT(makeRequest("booking-1", { status: "scheduled" }), makeParams("booking-1"))

    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        mentorId: "mentor-1",
        summary: expect.stringContaining("Carreira em programação"),
        date: "2026-04-15",
        time: "14:00",
        attendeeEmail: "maria.silva@test.com",
      }),
    )
  })

  it("should send scheduled email", async () => {
    await PUT(makeRequest("booking-1", { status: "scheduled" }), makeParams("booking-1"))

    expect(mockBookingScheduledEmail).toHaveBeenCalled()
    expect(mockSendMail).toHaveBeenCalled()
  })

  it("should not block booking update if Calendar fails", async () => {
    mockCreateCalendarEvent.mockRejectedValueOnce(new Error("Calendar API error"))

    const res = await PUT(makeRequest("booking-1", { status: "scheduled" }), makeParams("booking-1"))
    expect(res.status).toBe(200)
  })

  it("should warn when the booking has no mentor for the calendar", async () => {
    mockLimit.mockResolvedValueOnce([{ ...loadRow, booking: { ...loadRow.booking, mentorId: null } }])

    const res = await PUT(makeRequest("booking-1", { status: "scheduled" }), makeParams("booking-1"))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.calendar_warning).toBe(true)
    expect(mockCreateCalendarEvent).not.toHaveBeenCalled()
  })

  // --- Status: completed ---

  it("should send completed email", async () => {
    await PUT(makeRequest("booking-1", { status: "completed" }), makeParams("booking-1"))

    expect(mockBookingCompletedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        menteeName: "Maria Silva",
        topicName: "Carreira em programação",
      }),
    )
  })

  // --- Status: cancelled ---

  it("should send cancelled email", async () => {
    await PUT(makeRequest("booking-1", { status: "cancelled" }), makeParams("booking-1"))

    expect(mockBookingCancelledEmail).toHaveBeenCalled()
    expect(mockSendMail).toHaveBeenCalled()
  })

  // --- Guest email fallback ---

  it("should use guest_email when profiles.email is not available", async () => {
    mockLimit.mockResolvedValueOnce([{ ...loadRow, profile: null }])

    await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "maria@test.com" }),
    )
  })

  it("should use guest_name when profiles.full_name is not available", async () => {
    mockLimit.mockResolvedValueOnce([{ ...loadRow, profile: null }])

    await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))

    expect(mockBookingConfirmedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ menteeName: "Maria Teste" }),
    )
  })

  // --- No SMTP ---

  it("should still update booking when SMTP is not configured", async () => {
    delete process.env.SMTP_HOST

    const res = await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))
    expect(res.status).toBe(200)
    expect(mockSendMail).not.toHaveBeenCalled()
  })

  // --- Database error ---

  it("should return 500 if update fails", async () => {
    mockReturning.mockRejectedValueOnce(new Error("DB error"))

    const res = await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))
    expect(res.status).toBe(500)
  })
})
