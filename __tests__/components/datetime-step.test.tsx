import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DateTimeStep } from "@/components/booking/steps/datetime-step"
import type { ScheduleSlot } from "@/lib/types/booking"

const mockFreeSlots: ScheduleSlot[] = [
  { id: "s1", dayOfWeek: 5, dayName: "Sexta-feira", startTime: "20:00", slotType: "free", date: "2026-04-10", bookings: [], isAvailable: true },
  { id: "s2", dayOfWeek: 6, dayName: "Sábado", startTime: "09:00", slotType: "free", date: "2026-04-11", bookings: [], isAvailable: true },
  { id: "s3", dayOfWeek: 6, dayName: "Sábado", startTime: "14:00", slotType: "free", date: "2026-04-11", bookings: [{ id: "b1" }], isAvailable: false },
]

const mockPaidSlots: ScheduleSlot[] = [
  { id: "p1_2026-04-13", dayOfWeek: 1, dayName: "Segunda-feira", startTime: "14:00", slotType: "paid", date: "2026-04-13", bookings: [], isAvailable: true },
  { id: "p1_2026-04-15", dayOfWeek: 3, dayName: "Quarta-feira", startTime: "14:00", slotType: "paid", date: "2026-04-15", bookings: [], isAvailable: true },
  { id: "p1_2026-04-17", dayOfWeek: 5, dayName: "Sexta-feira", startTime: "14:00", slotType: "paid", date: "2026-04-17", bookings: [{ id: "b2" }], isAvailable: false },
]

describe("DateTimeStep — free slots", () => {
  const defaultProps = {
    mentoringType: "free" as const,
    slots: mockFreeSlots,
    slotsLoading: false,
    selectedSlotId: "",
    onSelectSlot: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  }

  it("should render available free slots only", () => {
    render(<DateTimeStep {...defaultProps} />)

    expect(screen.getByText("Sexta-feira")).toBeInTheDocument()
    expect(screen.getByText("Sábado")).toBeInTheDocument()
    // The unavailable slot at 14:00 should not show
    expect(screen.queryByText("14:00")).not.toBeInTheDocument()
    expect(screen.getByText("20:00")).toBeInTheDocument()
    expect(screen.getByText("09:00")).toBeInTheDocument()
  })

  it("should show scarcity badge when 2 or fewer slots", () => {
    render(<DateTimeStep {...defaultProps} />)

    expect(screen.getByText("Últimos horários!")).toBeInTheDocument()
  })

  it("should show loading state", () => {
    render(<DateTimeStep {...defaultProps} slotsLoading={true} />)

    expect(screen.getByText("Carregando horários...")).toBeInTheDocument()
  })

  it("should show empty state when no slots available", () => {
    render(<DateTimeStep {...defaultProps} slots={[]} />)

    expect(
      screen.getByText(/Todos os horários desta semana/),
    ).toBeInTheDocument()
  })

  it("should call onSelectSlot when clicking a slot", async () => {
    const onSelectSlot = vi.fn()
    const user = userEvent.setup()
    render(<DateTimeStep {...defaultProps} onSelectSlot={onSelectSlot} />)

    await user.click(screen.getByText("Sexta-feira"))
    expect(onSelectSlot).toHaveBeenCalledWith("s1", "2026-04-10", "20:00", "Sexta-feira")
  })

  it("should disable Próximo button when no slot selected", () => {
    render(<DateTimeStep {...defaultProps} selectedSlotId="" />)
    const nextBtns = screen.getAllByText("Próximo")
    // The navigation button is the one inside a <button> element
    const navBtn = nextBtns.find(el => el.closest("button[type='button']")?.classList.contains("gap-1.5"))
    expect(navBtn?.closest("button")).toBeDisabled()
  })

  it("should enable Próximo button when slot selected", () => {
    render(<DateTimeStep {...defaultProps} selectedSlotId="s1" />)
    const nextBtns = screen.getAllByText("Próximo")
    const navBtn = nextBtns.find(el => el.closest("button[type='button']")?.classList.contains("gap-1.5"))
    expect(navBtn?.closest("button")).not.toBeDisabled()
  })

  it("should show 'Próximo' badge on first slot", () => {
    render(<DateTimeStep {...defaultProps} />)
    // There should be at least 2 "Próximo" texts: badge + button
    expect(screen.getAllByText("Próximo").length).toBeGreaterThanOrEqual(2)
  })
})

describe("DateTimeStep — paid slots", () => {
  const defaultProps = {
    mentoringType: "paid" as const,
    slots: [...mockFreeSlots, ...mockPaidSlots],
    slotsLoading: false,
    selectedSlotId: "",
    onSelectSlot: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  }

  it("should render only paid available slots", () => {
    render(<DateTimeStep {...defaultProps} />)

    expect(screen.getByText("Segunda-feira")).toBeInTheDocument()
    expect(screen.getByText("Quarta-feira")).toBeInTheDocument()
    // Unavailable paid slot should not show
    // Free slots should not show
    expect(screen.queryByText("Sexta-feira")).not.toBeInTheDocument()
    expect(screen.queryByText("Sábado")).not.toBeInTheDocument()
  })

  it("should show correct empty message for paid", () => {
    render(<DateTimeStep {...defaultProps} slots={[]} />)

    expect(
      screen.getByText(/Nenhum horário disponível nas próximas semanas/),
    ).toBeInTheDocument()
  })
})
