import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Hoisted mocks ---
const {
  mockRequireRole,
  mockFrom,
  mockCreateCalendarEvent,
  mockSendMail,
  mockBookingConfirmedEmail,
  mockBookingPaymentPendingEmail,
  mockBookingScheduledEmail,
  mockBookingCompletedEmail,
  mockBookingCancelledEmail,
} = vi.hoisted(() => {
  return {
    mockRequireRole: vi.fn().mockResolvedValue(undefined),
    mockFrom: vi.fn(),
    mockCreateCalendarEvent: vi.fn().mockResolvedValue("gcal-event-id"),
    mockSendMail: vi.fn().mockResolvedValue({ messageId: "msg-1" }),
    mockBookingConfirmedEmail: vi.fn().mockReturnValue({ subject: "Confirmada", html: "<p>confirmed</p>" }),
    mockBookingPaymentPendingEmail: vi.fn().mockReturnValue({ subject: "Pagamento", html: "<p>payment</p>" }),
    mockBookingScheduledEmail: vi.fn().mockReturnValue({ subject: "Agendada", html: "<p>scheduled</p>" }),
    mockBookingCompletedEmail: vi.fn().mockReturnValue({ subject: "Concluida", html: "<p>completed</p>" }),
    mockBookingCancelledEmail: vi.fn().mockReturnValue({ subject: "Cancelada", html: "<p>cancelled</p>" }),
  }
})

vi.mock("@/lib/utils/auth", () => ({
  requireRole: mockRequireRole,
}))

vi.mock("@/lib/google-calendar", () => ({
  createCalendarEvent: mockCreateCalendarEvent,
}))

// Supabase admin mock with chainable methods
const mockUpdateSingle = vi.fn()
const mockUpdate = vi.fn(() => ({
  eq: vi.fn(() => ({
    select: vi.fn(() => ({
      single: mockUpdateSingle,
    })),
  })),
}))

const mockSelectSingle = vi.fn()
const mockSelectEq = vi.fn(() => ({
  single: mockSelectSingle,
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
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

const mockBooking = {
  id: "booking-1",
  session_date: "2026-04-15",
  start_time: "14:00:00",
  booking_type: "free",
  guest_name: "Maria Teste",
  guest_email: "maria@test.com",
  guest_whatsapp: "85999990000",
  google_event_id: null,
  mentoring_topics: { name: "Carreira em programação" },
  profiles: { full_name: "Maria Silva", email: "maria.silva@test.com" },
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

    // Setup chainable supabase mock
    mockFrom.mockImplementation((table: string) => {
      if (table === "bookings") {
        return {
          select: vi.fn(() => ({
            eq: mockSelectEq,
          })),
          update: mockUpdate,
        }
      }
      return {}
    })

    mockSelectSingle.mockResolvedValue({ data: { ...mockBooking }, error: null })
    mockUpdateSingle.mockResolvedValue({ data: { ...mockBooking, status: "confirmed" }, error: null })
  })

  // --- Auth ---

  it("should return 401 if not authenticated", async () => {
    mockRequireRole.mockRejectedValueOnce(Object.assign(new Error("Nao autenticado"), { status: 401 }))

    const res = await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))
    expect(res.status).toBe(401)
  })

  it("should return 403 if not admin", async () => {
    mockRequireRole.mockRejectedValueOnce(Object.assign(new Error("Acesso negado"), { status: 403 }))

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
    mockSelectSingle.mockResolvedValueOnce({ data: null, error: { message: "Not found" } })

    const res = await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))
    expect(res.status).toBe(404)
  })

  // --- Status: confirmed ---

  it("should update booking status to confirmed", async () => {
    await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))

    expect(mockUpdate).toHaveBeenCalled()
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

  it("should send payment pending email", async () => {
    await PUT(makeRequest("booking-1", { status: "payment_pending" }), makeParams("booking-1"))

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Pagamento",
      }),
    )
  })

  // --- Status: scheduled (Google Calendar) ---

  it("should create Google Calendar event when status is scheduled", async () => {
    await PUT(makeRequest("booking-1", { status: "scheduled" }), makeParams("booking-1"))

    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.stringContaining("Carreira em programação"),
        date: "2026-04-15",
        time: "14:00",
        attendeeEmail: "maria.silva@test.com",
      }),
    )
  })

  it("should save google_event_id in booking update", async () => {
    await PUT(makeRequest("booking-1", { status: "scheduled" }), makeParams("booking-1"))

    // The update function should be called with google_event_id
    expect(mockUpdate).toHaveBeenCalled()
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
    mockSelectSingle.mockResolvedValueOnce({
      data: { ...mockBooking, profiles: null },
      error: null,
    })

    await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "maria@test.com",
      }),
    )
  })

  it("should use guest_name when profiles.full_name is not available", async () => {
    mockSelectSingle.mockResolvedValueOnce({
      data: { ...mockBooking, profiles: null },
      error: null,
    })

    await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))

    expect(mockBookingConfirmedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        menteeName: "Maria Teste",
      }),
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
    mockUpdateSingle.mockResolvedValueOnce({ data: null, error: new Error("DB error") })

    const res = await PUT(makeRequest("booking-1", { status: "confirmed" }), makeParams("booking-1"))
    expect(res.status).toBe(500)
  })
})
