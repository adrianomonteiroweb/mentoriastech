import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StepNavigation } from "@/components/booking/step-navigation"

describe("StepNavigation", () => {
  const defaultProps = {
    onBack: vi.fn(),
    onNext: vi.fn(),
    canGoNext: true,
    isFirst: false,
    isLast: false,
  }

  it("should show Voltar and Próximo buttons", () => {
    render(<StepNavigation {...defaultProps} />)
    expect(screen.getByText("Voltar")).toBeInTheDocument()
    expect(screen.getByText("Próximo")).toBeInTheDocument()
  })

  it("should hide Voltar on first step", () => {
    render(<StepNavigation {...defaultProps} isFirst={true} />)
    expect(screen.queryByText("Voltar")).not.toBeInTheDocument()
  })

  it("should show submitLabel on last step", () => {
    render(
      <StepNavigation
        {...defaultProps}
        isLast={true}
        submitLabel="Solicitar mentoria"
      />,
    )
    expect(screen.getByText("Solicitar mentoria")).toBeInTheDocument()
    expect(screen.queryByText("Próximo")).not.toBeInTheDocument()
  })

  it("should show custom nextLabel when provided", () => {
    render(
      <StepNavigation
        {...defaultProps}
        nextLabel="Ir para pagamento"
      />,
    )
    expect(screen.getByText("Ir para pagamento")).toBeInTheDocument()
    expect(screen.queryByText("Próximo")).not.toBeInTheDocument()
  })

  it("should disable next button when canGoNext is false", () => {
    render(<StepNavigation {...defaultProps} canGoNext={false} />)
    const nextBtn = screen.getByText("Próximo").closest("button")
    expect(nextBtn).toBeDisabled()
  })

  it("should call onBack when clicking Voltar", async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    render(<StepNavigation {...defaultProps} onBack={onBack} />)
    await user.click(screen.getByText("Voltar"))
    expect(onBack).toHaveBeenCalled()
  })

  it("should call onNext when clicking Próximo", async () => {
    const onNext = vi.fn()
    const user = userEvent.setup()
    render(<StepNavigation {...defaultProps} onNext={onNext} />)
    await user.click(screen.getByText("Próximo"))
    expect(onNext).toHaveBeenCalled()
  })

  it("should show loading state", () => {
    render(<StepNavigation {...defaultProps} isLast={true} loading={true} />)
    expect(screen.getByText("Enviando...")).toBeInTheDocument()
  })
})
