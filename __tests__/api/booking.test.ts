import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock nodemailer
const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-id" })
const mockVerify = vi.fn().mockResolvedValue(true)
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      verify: mockVerify,
      sendMail: mockSendMail,
    })),
  },
}))

// Mock Supabase server client
const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  }),
}))

// Mock whatsapp util
vi.mock("@/lib/whatsapp", () => ({
  formatWhatsAppNumber: vi.fn((num: string) => num),
}))

// Import the POST handler after mocks are set up
import { POST } from "@/app/api/booking/route"

function makeRequest(body: Record<string, string>) {
  return new Request("http://localhost/api/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const validBody = {
  name: "Maria Teste",
  email: "maria@test.com",
  whatsapp: "5585999990000",
  day: "Sexta-feira",
  time: "20:00",
  topic: "Carreira em programação",
}

describe("POST /api/booking", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SMTP_HOST = "smtp.test.com"
    process.env.SMTP_PORT = "587"
    process.env.SMTP_USER = "user@test.com"
    process.env.SMTP_PASS = "password123"
  })

  it("should return 400 if name is missing", async () => {
    const { name, ...body } = validBody
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)

    const data = await res.json()
    expect(data.error).toContain("obrigatorios")
  })

  it("should return 400 if email is missing", async () => {
    const { email, ...body } = validBody
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
  })

  it("should return 400 if whatsapp is missing", async () => {
    const { whatsapp, ...body } = validBody
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
  })

  it("should return 400 if day is missing", async () => {
    const { day, ...body } = validBody
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
  })

  it("should return 400 if time is missing", async () => {
    const { time, ...body } = validBody
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
  })

  it("should return 400 if topic is missing", async () => {
    const { topic, ...body } = validBody
    const res = await POST(makeRequest(body))
    expect(res.status).toBe(400)
  })

  it("should return 500 if SMTP env vars are missing", async () => {
    delete process.env.SMTP_HOST
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(500)

    const data = await res.json()
    expect(data.error).toContain("email")
  })

  it("should save booking to Supabase with enriched data", async () => {
    const body = {
      ...validBody,
      slotId: "slot-123",
      topicId: "topic-456",
      sessionDate: "2026-04-10",
    }
    await POST(makeRequest(body))

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        guest_name: "Maria Teste",
        guest_email: "maria@test.com",
        guest_whatsapp: "5585999990000",
        booking_type: "free",
        status: "pending",
        slot_id: "slot-123",
        topic_id: "topic-456",
        session_date: "2026-04-10",
        start_time: "20:00",
      }),
    )
  })

  it("should send email on success", async () => {
    await POST(makeRequest(validBody))

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.any(String),
        subject: expect.stringContaining("Maria Teste"),
        replyTo: "maria@test.com",
      }),
    )
  })

  it("should return success true on success", async () => {
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it("should still succeed even if database insert fails", async () => {
    mockInsert.mockRejectedValueOnce(new Error("DB error"))

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
  })

  it("should return SMTP auth error message", async () => {
    mockVerify.mockRejectedValueOnce(new Error("Invalid login"))

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(500)

    const data = await res.json()
    expect(data.error).toContain("autenticacao")
  })

  it("should return SMTP connection error message", async () => {
    mockVerify.mockRejectedValueOnce(new Error("ECONNREFUSED"))

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(500)

    const data = await res.json()
    expect(data.error).toContain("indisponivel")
  })
})
