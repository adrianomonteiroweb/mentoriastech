import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock whatsapp util
vi.mock("@/lib/whatsapp", () => ({
  formatWhatsAppNumber: vi.fn((num: string) => num.replace(/\D/g, "")),
}))

import {
  newBookingToMentorEmail,
  bookingConfirmedEmail,
  bookingPaymentPendingEmail,
  bookingScheduledEmail,
  bookingCompletedEmail,
  bookingCancelledEmail,
} from "@/lib/email-templates"

describe("newBookingToMentorEmail", () => {
  const baseParams = {
    name: "Maria Teste",
    email: "maria@test.com",
    whatsapp: "5585999990000",
    topic: "Carreira em programação",
    day: "Sexta-feira",
    time: "20:00",
    bookingType: "free",
  }

  it("should include mentee name in subject", () => {
    const { subject } = newBookingToMentorEmail(baseParams)
    expect(subject).toContain("Maria Teste")
  })

  it("should include topic in subject", () => {
    const { subject } = newBookingToMentorEmail(baseParams)
    expect(subject).toContain("Carreira em programação")
  })

  it("should include 'Gratuita' label for free type", () => {
    const { subject } = newBookingToMentorEmail(baseParams)
    expect(subject).toContain("Gratuita")
  })

  it("should include 'Paga' label for paid type", () => {
    const { subject } = newBookingToMentorEmail({ ...baseParams, bookingType: "paid" })
    expect(subject).toContain("Paga")
  })

  it("should include 'Particular' label for private type", () => {
    const { subject } = newBookingToMentorEmail({ ...baseParams, bookingType: "private" })
    expect(subject).toContain("Particular")
  })

  it("should include all mentee data in html", () => {
    const { html } = newBookingToMentorEmail(baseParams)
    expect(html).toContain("Maria Teste")
    expect(html).toContain("maria@test.com")
    expect(html).toContain("5585999990000")
    expect(html).toContain("Carreira em programação")
    expect(html).toContain("Sexta-feira")
    expect(html).toContain("20:00")
  })

  it("should include notes when provided", () => {
    const { html } = newBookingToMentorEmail({ ...baseParams, notes: "Quero aprender React" })
    expect(html).toContain("Quero aprender React")
    expect(html).toContain("Observações")
  })

  it("should not include notes row when not provided", () => {
    const { html } = newBookingToMentorEmail(baseParams)
    expect(html).not.toContain("Observações")
  })

  it("should include WhatsApp link in html", () => {
    const { html } = newBookingToMentorEmail(baseParams)
    expect(html).toContain("wa.me/")
  })

  it("should include mailto link in html", () => {
    const { html } = newBookingToMentorEmail(baseParams)
    expect(html).toContain("mailto:maria@test.com")
  })
})

describe("bookingConfirmedEmail", () => {
  const baseParams = {
    menteeName: "João",
    topicName: "Next.js Avançado",
    sessionDate: "2026-04-15",
    startTime: "14:00:00",
    bookingType: "free",
  }

  it("should include topic in subject", () => {
    const { subject } = bookingConfirmedEmail(baseParams)
    expect(subject).toContain("Next.js Avançado")
    expect(subject).toContain("confirmada")
  })

  it("should include mentee name in html", () => {
    const { html } = bookingConfirmedEmail(baseParams)
    expect(html).toContain("João")
  })

  it("should format date as dd/mm/yyyy", () => {
    const { html } = bookingConfirmedEmail(baseParams)
    expect(html).toContain("15/04/2026")
  })

  it("should format time as HH:MM", () => {
    const { html } = bookingConfirmedEmail(baseParams)
    expect(html).toContain("14:00")
  })

  it("should show link message for free type", () => {
    const { html } = bookingConfirmedEmail(baseParams)
    expect(html).toContain("link da reunião")
  })

  it("should show confirmation message for paid type", () => {
    const { html } = bookingConfirmedEmail({ ...baseParams, bookingType: "paid" })
    expect(html).toContain("confirmação do agendamento")
  })

  it("should handle missing date gracefully", () => {
    const { html } = bookingConfirmedEmail({ ...baseParams, sessionDate: undefined })
    expect(html).toContain("A definir")
  })

  it("should handle missing time gracefully", () => {
    const { html } = bookingConfirmedEmail({ ...baseParams, startTime: undefined })
    expect(html).toContain("A definir")
  })
})

describe("bookingPaymentPendingEmail", () => {
  const baseParams = {
    menteeName: "Ana",
    topicName: "TypeScript",
    sessionDate: "2026-05-01",
    startTime: "10:00:00",
    bookingType: "paid",
  }

  it("should include topic in subject", () => {
    const { subject } = bookingPaymentPendingEmail(baseParams)
    expect(subject).toContain("TypeScript")
    expect(subject).toContain("pendente")
  })

  it("should include payment instructions", () => {
    const { html } = bookingPaymentPendingEmail(baseParams)
    expect(html).toContain("aguardando pagamento")
  })
})

describe("bookingScheduledEmail", () => {
  const baseParams = {
    menteeName: "Carlos",
    topicName: "React Hooks",
    sessionDate: "2026-06-10",
    startTime: "16:00:00",
    bookingType: "paid",
  }

  it("should include topic in subject", () => {
    const { subject } = bookingScheduledEmail(baseParams)
    expect(subject).toContain("React Hooks")
    expect(subject).toContain("agendada")
  })

  it("should mention Google Calendar", () => {
    const { html } = bookingScheduledEmail(baseParams)
    expect(html).toContain("Google Calendar")
  })

  it("should format date correctly", () => {
    const { html } = bookingScheduledEmail(baseParams)
    expect(html).toContain("10/06/2026")
  })
})

describe("bookingCompletedEmail", () => {
  const baseParams = {
    menteeName: "Diana",
    topicName: "DevOps",
    bookingType: "free",
  }

  it("should include topic in subject", () => {
    const { subject } = bookingCompletedEmail(baseParams)
    expect(subject).toContain("DevOps")
    expect(subject).toContain("concluída")
  })

  it("should thank mentee", () => {
    const { html } = bookingCompletedEmail(baseParams)
    expect(html).toContain("Obrigado")
    expect(html).toContain("Diana")
  })

  it("should mention feedback", () => {
    const { html } = bookingCompletedEmail(baseParams)
    expect(html).toContain("Feedback")
  })
})

describe("bookingCancelledEmail", () => {
  const baseParams = {
    menteeName: "Eduardo",
    topicName: "Python",
    bookingType: "paid",
  }

  it("should include topic in subject", () => {
    const { subject } = bookingCancelledEmail(baseParams)
    expect(subject).toContain("Python")
    expect(subject).toContain("cancelada")
  })

  it("should include mentee name in html", () => {
    const { html } = bookingCancelledEmail(baseParams)
    expect(html).toContain("Eduardo")
  })

  it("should include date when available", () => {
    const { html } = bookingCancelledEmail({ ...baseParams, sessionDate: "2026-07-01" })
    expect(html).toContain("01/07/2026")
  })

  it("should handle missing date", () => {
    const { html } = bookingCancelledEmail(baseParams)
    expect(html).not.toContain("undefined")
  })

  it("should suggest rescheduling", () => {
    const { html } = bookingCancelledEmail(baseParams)
    expect(html).toContain("reagendar")
  })
})
