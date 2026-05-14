import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Booking Lifecycle Integration Tests
 *
 * Tests the complete lifecycle of bookings through API routes:
 * - Free: booking → confirmed → scheduled (Calendar) → completed
 * - Paid: payment intent → webhook → scheduled (Calendar) → completed
 * - Cancellation flow
 */

// --- Hoisted mocks ---
const {
  mockRequireRole,
  mockSendMailBooking,
  mockVerify,
  mockSupabaseInsert,
  mockSupabaseFrom,
  mockAdminFrom,
  mockAdminSelectSingle,
  mockAdminUpdateSingle,
  mockCreateCalendarEvent,
} = vi.hoisted(() => ({
  mockRequireRole: vi.fn().mockResolvedValue(undefined),
  mockSendMailBooking: vi.fn().mockResolvedValue({ messageId: "booking-email" }),
  mockVerify: vi.fn().mockResolvedValue(true),
  mockSupabaseInsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  mockSupabaseFrom: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockAdminSelectSingle: vi.fn(),
  mockAdminUpdateSingle: vi.fn(),
  mockCreateCalendarEvent: vi.fn().mockResolvedValue("gcal-lifecycle-event"),
}))

// Mock modules for FREE booking route
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      verify: mockVerify,
      sendMail: mockSendMailBooking,
    })),
  },
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: mockSupabaseFrom,
  }),
}))

vi.mock("@/lib/whatsapp", () => ({
  formatWhatsAppNumber: vi.fn((num: string) => num),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}))

vi.mock("@/lib/email-templates", () => ({
  newBookingToMentorEmail: vi.fn(() => ({
    subject: "[PAGO] Nova mentoria - Lifecycle",
    html: "<p>lifecycle</p>",
  })),
  bookingConfirmedEmail: vi.fn(() => ({ subject: "Confirmada", html: "<p>confirmed</p>" })),
  bookingPaymentPendingEmail: vi.fn(() => ({ subject: "Pagamento", html: "<p>payment</p>" })),
  bookingScheduledEmail: vi.fn(() => ({ subject: "Agendada", html: "<p>scheduled</p>" })),
  bookingCompletedEmail: vi.fn(() => ({ subject: "Concluida", html: "<p>completed</p>" })),
  bookingCancelledEmail: vi.fn(() => ({ subject: "Cancelada", html: "<p>cancelled</p>" })),
}))

vi.mock("@/lib/utils/auth", () => ({
  requireRole: mockRequireRole,
}))

vi.mock("@/lib/google-calendar", () => ({
  createCalendarEvent: mockCreateCalendarEvent,
}))

// Import route handlers
import { POST as BookingPOST } from "@/app/api/booking/route"
import { PUT as AdminBookingPUT } from "@/app/api/admin/bookings/[id]/route"

// --- Helpers ---

function makeBookingRequest(body: Record<string, string>) {
  return new Request("http://localhost/api/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeAdminRequest(id: string, body: Record<string, unknown>) {
  return new Request(`http://localhost/api/admin/bookings/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeAdminParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

const freeBookingData = {
  name: "Ana Lifecycle",
  email: "ana@lifecycle.com",
  whatsapp: "5585999990001",
  day: "Sexta-feira",
  time: "20:00",
  topic: "Carreira em programação",
  slotId: "slot-free-1",
  topicId: "topic-free-1",
  sessionDate: "2026-04-17",
}

const bookingRecord = {
  id: "booking-lifecycle-1",
  session_date: "2026-04-17",
  start_time: "20:00:00",
  booking_type: "free",
  guest_name: "Ana Lifecycle",
  guest_email: "ana@lifecycle.com",
  guest_whatsapp: "5585999990001",
  google_event_id: null,
  mentoring_topics: { name: "Carreira em programação" },
  profiles: null,
}

describe("Free Booking Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.SMTP_HOST = "smtp.test.com"
    process.env.SMTP_PORT = "587"
    process.env.SMTP_USER = "user@test.com"
    process.env.SMTP_PASS = "pass123"

    mockSupabaseFrom.mockReturnValue({ insert: mockSupabaseInsert })

    // Admin supabase mock
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "bookings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockAdminSelectSingle,
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: mockAdminUpdateSingle,
              })),
            })),
          })),
        }
      }
      return {}
    })

    mockAdminSelectSingle.mockResolvedValue({ data: { ...bookingRecord }, error: null })
    mockAdminUpdateSingle.mockResolvedValue({
      data: { ...bookingRecord, status: "confirmed" },
      error: null,
    })
  })

  it("Step 1: should create free booking via POST /api/booking", async () => {
    const res = await BookingPOST(makeBookingRequest(freeBookingData))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)

    // Should save to Supabase
    expect(mockSupabaseInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        guest_name: "Ana Lifecycle",
        booking_type: "free",
        status: "pending",
      }),
    )

    // Should send email to mentor
    expect(mockSendMailBooking).toHaveBeenCalled()
  })

  it("Step 2: admin confirms booking → email sent to mentee", async () => {
    const res = await AdminBookingPUT(
      makeAdminRequest("booking-lifecycle-1", { status: "confirmed" }),
      makeAdminParams("booking-lifecycle-1"),
    )
    expect(res.status).toBe(200)

    // Confirmed email template should be called
    const { bookingConfirmedEmail } = await import("@/lib/email-templates")
    expect(bookingConfirmedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        menteeName: "Ana Lifecycle",
        topicName: "Carreira em programação",
      }),
    )
  })

  it("Step 3: admin schedules booking → Google Calendar event created", async () => {
    const res = await AdminBookingPUT(
      makeAdminRequest("booking-lifecycle-1", { status: "scheduled" }),
      makeAdminParams("booking-lifecycle-1"),
    )
    expect(res.status).toBe(200)

    // Calendar event should be created
    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.stringContaining("Carreira em programação"),
        date: "2026-04-17",
        time: "20:00",
      }),
    )
  })

  it("Step 4: admin completes booking → completion email sent", async () => {
    const res = await AdminBookingPUT(
      makeAdminRequest("booking-lifecycle-1", { status: "completed" }),
      makeAdminParams("booking-lifecycle-1"),
    )
    expect(res.status).toBe(200)

    const { bookingCompletedEmail } = await import("@/lib/email-templates")
    expect(bookingCompletedEmail).toHaveBeenCalled()
  })
})

describe("Paid Booking Lifecycle", () => {
  const paidBookingRecord = {
    ...bookingRecord,
    id: "booking-paid-lifecycle",
    booking_type: "paid",
    guest_name: "Carlos Pago",
    guest_email: "carlos@lifecycle.com",
    session_date: "2026-04-20",
    start_time: "14:00:00",
    mentoring_topics: { name: "Aulas de Next.js" },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    process.env.SMTP_HOST = "smtp.test.com"
    process.env.SMTP_PORT = "587"
    process.env.SMTP_USER = "user@test.com"
    process.env.SMTP_PASS = "pass123"

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "bookings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockAdminSelectSingle,
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: mockAdminUpdateSingle,
              })),
            })),
          })),
        }
      }
      return {}
    })

    mockAdminSelectSingle.mockResolvedValue({ data: paidBookingRecord, error: null })
    mockAdminUpdateSingle.mockResolvedValue({
      data: { ...paidBookingRecord, status: "scheduled" },
      error: null,
    })
  })

  it("Step 1: admin schedules paid booking → Calendar event created", async () => {
    const res = await AdminBookingPUT(
      makeAdminRequest("booking-paid-lifecycle", { status: "scheduled" }),
      makeAdminParams("booking-paid-lifecycle"),
    )
    expect(res.status).toBe(200)

    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.stringContaining("Aulas de Next.js"),
        date: "2026-04-20",
        time: "14:00",
      }),
    )
  })

  it("Step 2: admin completes paid booking → completion email sent", async () => {
    const res = await AdminBookingPUT(
      makeAdminRequest("booking-paid-lifecycle", { status: "completed" }),
      makeAdminParams("booking-paid-lifecycle"),
    )
    expect(res.status).toBe(200)

    const { bookingCompletedEmail } = await import("@/lib/email-templates")
    expect(bookingCompletedEmail).toHaveBeenCalled()
  })
})

describe("Booking Cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.SMTP_HOST = "smtp.test.com"
    process.env.SMTP_USER = "user@test.com"
    process.env.SMTP_PASS = "pass123"

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "bookings") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: mockAdminSelectSingle,
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: mockAdminUpdateSingle,
              })),
            })),
          })),
        }
      }
      return {}
    })

    mockAdminSelectSingle.mockResolvedValue({ data: { ...bookingRecord }, error: null })
    mockAdminUpdateSingle.mockResolvedValue({
      data: { ...bookingRecord, status: "cancelled" },
      error: null,
    })
  })

  it("should send cancellation email when booking is cancelled", async () => {
    const res = await AdminBookingPUT(
      makeAdminRequest("booking-lifecycle-1", { status: "cancelled" }),
      makeAdminParams("booking-lifecycle-1"),
    )
    expect(res.status).toBe(200)

    const { bookingCancelledEmail } = await import("@/lib/email-templates")
    expect(bookingCancelledEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        menteeName: "Ana Lifecycle",
        topicName: "Carreira em programação",
      }),
    )
  })
})
