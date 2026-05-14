import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BookingSuccess } from "@/components/booking/booking-success"

describe("BookingSuccess", () => {
  it("should render success heading", () => {
    render(<BookingSuccess bookingType="free" onReset={vi.fn()} />)

    expect(screen.getByText("Solicitação enviada!")).toBeInTheDocument()
  })

  it("should show free booking message with WhatsApp mention", () => {
    render(<BookingSuccess bookingType="free" onReset={vi.fn()} />)

    expect(screen.getByText(/WhatsApp/)).toBeInTheDocument()
    expect(screen.getByText(/confirmar o agendamento/)).toBeInTheDocument()
  })

  it("should show paid booking message with payment mention", () => {
    render(<BookingSuccess bookingType="paid" onReset={vi.fn()} />)

    expect(screen.getByText(/combinar os detalhes do pagamento/)).toBeInTheDocument()
  })

  it("should show private booking message same as paid", () => {
    render(<BookingSuccess bookingType="private" onReset={vi.fn()} />)

    expect(screen.getByText(/combinar os detalhes do pagamento/)).toBeInTheDocument()
  })

  it("should render reset button", () => {
    render(<BookingSuccess bookingType="free" onReset={vi.fn()} />)

    expect(screen.getByText("Solicitar nova mentoria")).toBeInTheDocument()
  })

  it("should call onReset when clicking reset button", async () => {
    const onReset = vi.fn()
    const user = userEvent.setup()
    render(<BookingSuccess bookingType="free" onReset={onReset} />)

    await user.click(screen.getByText("Solicitar nova mentoria"))
    expect(onReset).toHaveBeenCalledOnce()
  })
})
