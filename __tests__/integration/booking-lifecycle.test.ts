import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Booking Lifecycle Integration Tests
 *
 * Tests the complete lifecycle of bookings through API routes:
 * - Free: booking (POST /api/booking) → confirmed → scheduled (Calendar) → completed
 * - Paid: scheduled (Calendar) → completed
 *
 * As rotas usam Drizzle (@/lib/db) + requireMentorAccess/getDefaultMentorId.
 * Mantemos os mocks de nodemailer + email-templates para que o helper real
 * sendBookingStatusEmail (em @/lib/booking-notifications) os exercite.
 */

// --- Hoisted mocks ---
const {
  mockRequireMentorAccess,
  mockGetDefaultMentorId,
  mockEnsureMenteeProfile,
  mockHasBookingConflict,
  mockInsertValues,
  mockLimit,
  mockReturning,
  mockSendMailBooking,
  mockCreateCalendarEvent,
  mockDeleteCalendarEvent,
  mockNewBookingToMentorEmail,
  mockBookingConfirmedEmail,
  mockBookingPaymentPendingEmail,
  mockBookingScheduledEmail,
  mockBookingCompletedEmail,
  mockBookingCancelledEmail,
} = vi.hoisted(() => ({
  mockRequireMentorAccess: vi.fn().mockResolvedValue({ id: "mentor-1", role: "admin" }),
  mockGetDefaultMentorId: vi.fn().mockResolvedValue("mentor-1"),
  mockEnsureMenteeProfile: vi.fn().mockResolvedValue({ id: "mentee-1" }),
  mockHasBookingConflict: vi.fn().mockResolvedValue(false),
  mockInsertValues: vi.fn().mockResolvedValue(undefined),
  mockLimit: vi.fn(),
  mockReturning: vi.fn(),
  mockSendMailBooking: vi.fn().mockResolvedValue({ messageId: "booking-email" }),
  mockCreateCalendarEvent: vi.fn().mockResolvedValue({ eventId: "gcal-lifecycle-event", meetLink: null }),
  mockDeleteCalendarEvent: vi.fn().mockResolvedValue(undefined),
  mockNewBookingToMentorEmail: vi.fn(() => ({ subject: "[Mentoria] Nova solicitacao", html: "<p>lifecycle</p>" })),
  mockBookingConfirmedEmail: vi.fn(() => ({ subject: "Confirmada", html: "<p>confirmed</p>" })),
  mockBookingPaymentPendingEmail: vi.fn(() => ({ subject: "Pagamento", html: "<p>payment</p>" })),
  mockBookingScheduledEmail: vi.fn(() => ({ subject: "Agendada", html: "<p>scheduled</p>" })),
  mockBookingCompletedEmail: vi.fn(() => ({ subject: "Concluida", html: "<p>completed</p>" })),
  mockBookingCancelledEmail: vi.fn(() => ({ subject: "Cancelada", html: "<p>cancelled</p>" })),
}))

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      verify: vi.fn().mockResolvedValue(true),
      sendMail: mockSendMailBooking,
    })),
  },
}))

vi.mock("@/lib/utils/auth", () => ({
  requireMentorAccess: mockRequireMentorAccess,
  getDefaultMentorId: mockGetDefaultMentorId,
  getMentorId: (profile: { id: string }) => profile.id,
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
      insert: vi.fn(() => ({ values: mockInsertValues })),
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

vi.mock("@/lib/db/mentees", () => ({
  ensureMenteeProfile: mockEnsureMenteeProfile,
}))

vi.mock("@/lib/db/mappers", () => ({
  toBooking: (x: unknown) => x,
}))

vi.mock("@/lib/google-calendar", () => ({
  createCalendarEvent: mockCreateCalendarEvent,
  deleteCalendarEvent: mockDeleteCalendarEvent,
}))

vi.mock("@/lib/email-templates", () => ({
  newBookingToMentorEmail: mockNewBookingToMentorEmail,
  bookingConfirmedEmail: mockBookingConfirmedEmail,
  bookingPaymentPendingEmail: mockBookingPaymentPendingEmail,
  bookingScheduledEmail: mockBookingScheduledEmail,
  bookingCompletedEmail: mockBookingCompletedEmail,
  bookingCancelledEmail: mockBookingCancelledEmail,
}))

// Import route handlers
import { POST as BookingPOST } from "@/app/api/booking/route"
import { PUT as AdminBookingPUT } from "@/app/api/admin/bookings/[id]/route"

// --- Helpers ---

function makeBookingRequest(body: Record<string, unknown>) {
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
  originCategory: "instagram",
}

const freeLoadRow = {
  booking: {
    id: "booking-lifecycle-1",
    mentorId: "mentor-1",
    menteeId: "mentee-1",
    status: "pending",
    sessionDate: "2026-04-17",
    startTime: "20:00:00",
    bookingType: "free",
    googleEventId: null,
    guestName: "Ana Lifecycle",
    guestEmail: "ana@lifecycle.com",
  },
  topic: { name: "Carreira em programação" },
  profile: null,
}

const freeUpdatedRow = {
  id: "booking-lifecycle-1",
  sessionDate: "2026-04-17",
  startTime: "20:00:00",
  bookingType: "free",
  googleEventId: null,
  googleMeetUrl: null,
}

describe("Free Booking Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.SMTP_HOST = "smtp.test.com"
    process.env.SMTP_PORT = "587"
    process.env.SMTP_USER = "user@test.com"
    process.env.SMTP_PASS = "pass123"

    mockRequireMentorAccess.mockResolvedValue({ id: "mentor-1", role: "admin" })
    mockGetDefaultMentorId.mockResolvedValue("mentor-1")
    mockEnsureMenteeProfile.mockResolvedValue({ id: "mentee-1" })
    mockHasBookingConflict.mockResolvedValue(false)
    mockInsertValues.mockResolvedValue(undefined)
    mockLimit.mockResolvedValue([{ ...freeLoadRow }])
    mockReturning.mockResolvedValue([{ ...freeUpdatedRow }])
    mockCreateCalendarEvent.mockResolvedValue({ eventId: "gcal-lifecycle-event", meetLink: null })
  })

  it("Step 1: should create free booking via POST /api/booking", async () => {
    // O POST consulta o perfil do mentor (para o e-mail) via db.select().limit().
    mockLimit.mockResolvedValueOnce([{ email: "mentor@test.com", fullName: "Mentor" }])

    const res = await BookingPOST(makeBookingRequest(freeBookingData))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)

    // Insert via Drizzle (camelCase)
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        guestName: "Ana Lifecycle",
        bookingType: "free",
        status: "pending",
      }),
    )

    // E-mail ao mentor
    expect(mockSendMailBooking).toHaveBeenCalled()
  })

  it("Step 2: admin confirms booking → email sent to mentee", async () => {
    const res = await AdminBookingPUT(
      makeAdminRequest("booking-lifecycle-1", { status: "confirmed" }),
      makeAdminParams("booking-lifecycle-1"),
    )
    expect(res.status).toBe(200)

    expect(mockBookingConfirmedEmail).toHaveBeenCalledWith(
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

    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        mentorId: "mentor-1",
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

    expect(mockBookingCompletedEmail).toHaveBeenCalled()
  })
})

describe("Paid Booking Lifecycle", () => {
  const paidLoadRow = {
    booking: {
      id: "booking-paid-lifecycle",
      mentorId: "mentor-1",
      menteeId: "mentee-2",
      status: "paid",
      sessionDate: "2026-04-20",
      startTime: "14:00:00",
      bookingType: "paid",
      googleEventId: null,
      guestName: "Carlos Pago",
      guestEmail: "carlos@lifecycle.com",
    },
    topic: { name: "Aulas de Next.js" },
    profile: null,
  }

  const paidUpdatedRow = {
    id: "booking-paid-lifecycle",
    sessionDate: "2026-04-20",
    startTime: "14:00:00",
    bookingType: "paid",
    googleEventId: null,
    googleMeetUrl: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    process.env.SMTP_HOST = "smtp.test.com"
    process.env.SMTP_PORT = "587"
    process.env.SMTP_USER = "user@test.com"
    process.env.SMTP_PASS = "pass123"

    mockRequireMentorAccess.mockResolvedValue({ id: "mentor-1", role: "admin" })
    mockHasBookingConflict.mockResolvedValue(false)
    mockLimit.mockResolvedValue([{ ...paidLoadRow }])
    mockReturning.mockResolvedValue([{ ...paidUpdatedRow }])
    mockCreateCalendarEvent.mockResolvedValue({ eventId: "gcal-paid-event", meetLink: null })
  })

  it("Step 1: admin schedules paid booking → Calendar event created", async () => {
    const res = await AdminBookingPUT(
      makeAdminRequest("booking-paid-lifecycle", { status: "scheduled" }),
      makeAdminParams("booking-paid-lifecycle"),
    )
    expect(res.status).toBe(200)

    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        mentorId: "mentor-1",
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

    expect(mockBookingCompletedEmail).toHaveBeenCalled()
  })
})
