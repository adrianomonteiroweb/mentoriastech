import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null }),
        })),
      })),
    })),
  })),
}))

const mockFreeSlots = [
  {
    id: "s1",
    slotId: "11111111-1111-4111-8111-111111111111",
    dayOfWeek: 5,
    dayName: "Sexta-feira",
    startTime: "20:00",
    slotType: "free",
    date: "2026-04-10",
    bookings: [],
    isAvailable: true,
  },
  {
    id: "s2",
    slotId: "22222222-2222-4222-8222-222222222222",
    dayOfWeek: 6,
    dayName: "Sábado",
    startTime: "09:00",
    slotType: "free",
    date: "2026-04-11",
    bookings: [],
    isAvailable: true,
  },
]

const mockPaidSlots = [
  {
    id: "p1_2026-04-13",
    slotId: "44444444-4444-4444-8444-444444444444",
    dayOfWeek: 1,
    dayName: "Segunda-feira",
    startTime: "14:00",
    slotType: "paid",
    date: "2026-04-13",
    bookings: [],
    isAvailable: true,
  },
]

const mockFreeTopics = [
  { id: "ft1", name: "Carreira em programação", category: "free", description: null },
  { id: "ft2", name: "Desenvolvimento Web", category: "free", description: null },
]

const mockPaidTopics = [
  { id: "pt1", name: "Aulas de Next.js", category: "paid", description: null },
]

const allTopics = [...mockFreeTopics, ...mockPaidTopics]
const allSlots = [...mockFreeSlots, ...mockPaidSlots]

import { UnifiedBookingForm } from "@/components/booking/unified-booking-form"

// Helper to find and click the navigation "Próximo" button
async function clickNavNext(user: ReturnType<typeof userEvent.setup>) {
  const btns = screen.getAllByText("Próximo")
  const btn = btns.find(
    (el) => el.closest("button[type='button']")?.classList.contains("gap-1.5"),
  )
  await user.click(btn!.closest("button")!)
}

describe("UnifiedBookingForm — free flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr.includes("/api/schedule")) {
        return Promise.resolve(
          new Response(JSON.stringify({ schedule: allSlots }), { status: 200 }),
        )
      }
      if (urlStr.includes("/api/topics")) {
        return Promise.resolve(
          new Response(JSON.stringify({ topics: allTopics }), { status: 200 }),
        )
      }
      if (urlStr.includes("/api/booking")) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), { status: 200 }),
        )
      }
      return Promise.reject(new Error("Unknown URL: " + urlStr))
    }) as typeof fetch
  })

  it("should render TypeStep on mount", async () => {
    render(<UnifiedBookingForm />)

    await waitFor(() => {
      expect(screen.getByText("Mentoria Gratuita")).toBeInTheDocument()
    })
  })

  it("should navigate through free flow steps to ContactStep", async () => {
    const user = userEvent.setup()
    render(<UnifiedBookingForm />)

    // Step 0: Type — "Mentoria Gratuita" pre-selected, click Próximo
    await waitFor(() => {
      expect(screen.getByText("Mentoria Gratuita")).toBeInTheDocument()
    })
    await clickNavNext(user)

    // Step 1: Topic — select topic (auto-advances after 400ms)
    await waitFor(() => {
      expect(screen.getByText("Carreira em programação")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Carreira em programação"))

    // Step 2: DateTime — wait for auto-advance from topic, then select slot
    await waitFor(() => {
      expect(screen.getByText("Sexta-feira")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Sexta-feira"))
    // DateTimeStep does NOT auto-advance, must click Próximo
    await clickNavNext(user)

    // Step 3: Contact — should show contact form
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Seu nome e sobrenome")).toBeInTheDocument()
    })
  })

  it("should submit free booking and show success", async () => {
    const user = userEvent.setup()
    render(<UnifiedBookingForm />)

    // Step 0: Type → Próximo
    await waitFor(() => {
      expect(screen.getByText("Mentoria Gratuita")).toBeInTheDocument()
    })
    await clickNavNext(user)

    // Step 1: Select topic (auto-advances)
    await waitFor(() => {
      expect(screen.getByText("Carreira em programação")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Carreira em programação"))

    // Step 2: Select slot → Próximo
    await waitFor(() => {
      expect(screen.getByText("Sexta-feira")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Sexta-feira"))
    await clickNavNext(user)

    // Step 3: Fill contact → Próximo
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Seu nome e sobrenome")).toBeInTheDocument()
    })
    await user.type(screen.getByPlaceholderText("Seu nome e sobrenome"), "Maria Teste")
    await user.type(screen.getByPlaceholderText("seu@email.com"), "maria@test.com")
    await user.type(screen.getByPlaceholderText("(85) 99999-9999"), "85999990000")
    await clickNavNext(user)

    // Step 4: Review → Submit
    await waitFor(() => {
      expect(screen.getByText("Solicitar mentoria")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Solicitar mentoria"))

    // Success screen
    await waitFor(() => {
      expect(screen.getByText("Solicitação enviada!")).toBeInTheDocument()
    })
  })

  it("should show error when booking API fails", async () => {
    global.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr.includes("/api/schedule")) {
        return Promise.resolve(
          new Response(JSON.stringify({ schedule: allSlots }), { status: 200 }),
        )
      }
      if (urlStr.includes("/api/topics")) {
        return Promise.resolve(
          new Response(JSON.stringify({ topics: allTopics }), { status: 200 }),
        )
      }
      if (urlStr.includes("/api/booking")) {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Erro de teste" }), { status: 500 }),
        )
      }
      return Promise.reject(new Error("Unknown URL"))
    }) as typeof fetch

    const user = userEvent.setup()
    render(<UnifiedBookingForm />)

    // Navigate through all steps
    await waitFor(() => {
      expect(screen.getByText("Mentoria Gratuita")).toBeInTheDocument()
    })
    await clickNavNext(user)

    await waitFor(() => {
      expect(screen.getByText("Carreira em programação")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Carreira em programação"))

    await waitFor(() => {
      expect(screen.getByText("Sexta-feira")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Sexta-feira"))
    await clickNavNext(user)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Seu nome e sobrenome")).toBeInTheDocument()
    })
    await user.type(screen.getByPlaceholderText("Seu nome e sobrenome"), "Maria Teste")
    await user.type(screen.getByPlaceholderText("seu@email.com"), "maria@test.com")
    await user.type(screen.getByPlaceholderText("(85) 99999-9999"), "85999990000")
    await clickNavNext(user)

    await waitFor(() => {
      expect(screen.getByText("Solicitar mentoria")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Solicitar mentoria"))

    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText("Erro de teste")).toBeInTheDocument()
    })
  })
})

describe("UnifiedBookingForm — paid flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr.includes("/api/schedule")) {
        return Promise.resolve(
          new Response(JSON.stringify({ schedule: allSlots }), { status: 200 }),
        )
      }
      if (urlStr.includes("/api/topics")) {
        return Promise.resolve(
          new Response(JSON.stringify({ topics: allTopics }), { status: 200 }),
        )
      }
      if (urlStr.includes("/api/booking/paid")) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), { status: 200 }),
        )
      }
      return Promise.reject(new Error("Unknown URL: " + urlStr))
    }) as typeof fetch
  })

  it("should show Passo X de 5 for paid booking", async () => {
    const user = userEvent.setup()
    render(<UnifiedBookingForm />)

    // Select paid type
    await waitFor(() => {
      expect(screen.getByText("Mentoria Paga")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Mentoria Paga"))

    // Stepper should show "Passo 1 de 5" (5 steps for all types)
    await waitFor(() => {
      expect(screen.getByText(/Passo 1 de 5/)).toBeInTheDocument()
    })
  })

  it("should show 'Solicitar mentoria' on review step for paid booking", async () => {
    const user = userEvent.setup()
    render(<UnifiedBookingForm />)

    // Select paid type → Próximo
    await waitFor(() => {
      expect(screen.getByText("Mentoria Paga")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Mentoria Paga"))
    await clickNavNext(user)

    // Select paid topic (auto-advances)
    await waitFor(() => {
      expect(screen.getByText("Aulas de Next.js")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Aulas de Next.js"))

    // Select paid slot → Próximo
    await waitFor(() => {
      expect(screen.getByText("Segunda-feira")).toBeInTheDocument()
    })
    await user.click(screen.getByText("Segunda-feira"))
    await clickNavNext(user)

    // Fill contact → Próximo
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Seu nome e sobrenome")).toBeInTheDocument()
    })
    await user.type(screen.getByPlaceholderText("Seu nome e sobrenome"), "João Teste")
    await user.type(screen.getByPlaceholderText("seu@email.com"), "joao@test.com")
    await user.type(screen.getByPlaceholderText("(85) 99999-9999"), "85999990002")
    await clickNavNext(user)

    // Review — should show "Solicitar mentoria" (no more payment step)
    await waitFor(() => {
      expect(screen.getByText("Solicitar mentoria")).toBeInTheDocument()
    })
  })

  it("should show paid step count with defaultType paid", async () => {
    render(<UnifiedBookingForm defaultType="paid" />)

    // With defaultType="paid", step count should be 5
    await waitFor(() => {
      expect(screen.getByText(/de 5/)).toBeInTheDocument()
    })
  })
})

describe("UnifiedBookingForm — fallback data", () => {
  it("should use fallback topics when API fails", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("Network error"))) as typeof fetch

    const user = userEvent.setup()
    render(<UnifiedBookingForm />)

    // Wait for data to load (will fail and use fallback)
    await waitFor(() => {
      expect(screen.getByText("Mentoria Gratuita")).toBeInTheDocument()
    })

    // Navigate to topic step
    await clickNavNext(user)

    // Should show fallback topics
    await waitFor(() => {
      expect(screen.getByText("Carreira em programação")).toBeInTheDocument()
      expect(screen.getByText("Automações RPA")).toBeInTheDocument()
    })
  })
})
