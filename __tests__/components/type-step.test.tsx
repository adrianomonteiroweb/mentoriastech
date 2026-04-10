import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TypeStep } from "@/components/booking/steps/type-step"

describe("TypeStep", () => {
  const defaultProps = {
    mentoringType: "free" as const,
    onSelect: vi.fn(),
    onNext: vi.fn(),
  }

  it("should render all three mentoring type options", () => {
    render(<TypeStep {...defaultProps} />)

    expect(screen.getByText("Mentoria Gratuita")).toBeInTheDocument()
    expect(screen.getByText("Mentoria Paga")).toBeInTheDocument()
    expect(screen.getByText("Mentoria Particular")).toBeInTheDocument()
  })

  it("should render badges", () => {
    render(<TypeStep {...defaultProps} />)

    expect(screen.getByText("Grátis")).toBeInTheDocument()
    expect(screen.getAllByText("PIX")).toHaveLength(2)
  })

  it("should call onSelect when clicking a type", async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TypeStep {...defaultProps} onSelect={onSelect} />)

    await user.click(screen.getByText("Mentoria Paga"))
    expect(onSelect).toHaveBeenCalledWith("paid")
  })

  it("should call onNext when clicking Próximo", async () => {
    const onNext = vi.fn()
    const user = userEvent.setup()
    render(<TypeStep {...defaultProps} onNext={onNext} />)

    await user.click(screen.getByText("Próximo"))
    expect(onNext).toHaveBeenCalled()
  })

  it("should not show Voltar button (isFirst)", () => {
    render(<TypeStep {...defaultProps} />)
    expect(screen.queryByText("Voltar")).not.toBeInTheDocument()
  })

  it("should show description text", () => {
    render(<TypeStep {...defaultProps} />)
    expect(
      screen.getByText(/Escolha o tipo de mentoria/),
    ).toBeInTheDocument()
  })
})
