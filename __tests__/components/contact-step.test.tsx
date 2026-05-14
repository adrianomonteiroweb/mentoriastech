import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ContactStep } from "@/components/booking/steps/contact-step"

const defaultProps = {
  name: "",
  email: "",
  whatsapp: "",
  notes: "",
  isAuthenticated: false,
  mentoringType: "free" as const,
  onChangeName: vi.fn(),
  onChangeEmail: vi.fn(),
  onChangeWhatsapp: vi.fn(),
  onChangeNotes: vi.fn(),
  onNext: vi.fn(),
  onBack: vi.fn(),
}

describe("ContactStep", () => {
  it("should render all three required fields", () => {
    render(<ContactStep {...defaultProps} />)

    expect(screen.getByPlaceholderText("Seu nome e sobrenome")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("seu@email.com")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("(85) 99999-9999")).toBeInTheDocument()
  })

  it("should show authenticated banner when isAuthenticated is true", () => {
    render(<ContactStep {...defaultProps} isAuthenticated={true} />)

    expect(screen.getByText(/preenchidos automaticamente/)).toBeInTheDocument()
  })

  it("should hide authenticated banner when isAuthenticated is false", () => {
    render(<ContactStep {...defaultProps} isAuthenticated={false} />)

    expect(screen.queryByText(/preenchidos automaticamente/)).not.toBeInTheDocument()
  })

  it("should show notes textarea for paid mentoring", () => {
    render(<ContactStep {...defaultProps} mentoringType="paid" />)

    expect(screen.getByPlaceholderText(/abordar na mentoria/)).toBeInTheDocument()
  })

  it("should show notes textarea for private mentoring", () => {
    render(<ContactStep {...defaultProps} mentoringType="private" />)

    expect(screen.getByPlaceholderText(/abordar na mentoria/)).toBeInTheDocument()
  })

  it("should hide notes textarea for free mentoring", () => {
    render(<ContactStep {...defaultProps} mentoringType="free" />)

    expect(screen.queryByPlaceholderText(/abordar na mentoria/)).not.toBeInTheDocument()
  })

  it("should call onChangeName when typing in name field", async () => {
    const onChangeName = vi.fn()
    const user = userEvent.setup()
    render(<ContactStep {...defaultProps} onChangeName={onChangeName} />)

    await user.type(screen.getByPlaceholderText("Seu nome e sobrenome"), "A")
    expect(onChangeName).toHaveBeenCalled()
  })

  it("should call onChangeEmail when typing in email field", async () => {
    const onChangeEmail = vi.fn()
    const user = userEvent.setup()
    render(<ContactStep {...defaultProps} onChangeEmail={onChangeEmail} />)

    await user.type(screen.getByPlaceholderText("seu@email.com"), "a")
    expect(onChangeEmail).toHaveBeenCalled()
  })

  it("should call onChangeWhatsapp when typing in whatsapp field", async () => {
    const onChangeWhatsapp = vi.fn()
    const user = userEvent.setup()
    render(<ContactStep {...defaultProps} onChangeWhatsapp={onChangeWhatsapp} />)

    await user.type(screen.getByPlaceholderText("(85) 99999-9999"), "8")
    expect(onChangeWhatsapp).toHaveBeenCalled()
  })

  it("should disable Próximo button when all fields empty", () => {
    render(<ContactStep {...defaultProps} name="" email="" whatsapp="" />)

    const nextBtns = screen.getAllByText("Próximo")
    const navBtn = nextBtns.find((el) => el.closest("button"))
    expect(navBtn?.closest("button")).toBeDisabled()
  })

  it("should enable Próximo button when all fields filled", () => {
    render(
      <ContactStep
        {...defaultProps}
        name="Maria Teste"
        email="maria@test.com"
        whatsapp="85999990000"
      />,
    )

    const nextBtns = screen.getAllByText("Próximo")
    const navBtn = nextBtns.find(
      (el) => el.closest("button[type='button']")?.classList.contains("gap-1.5"),
    )
    expect(navBtn?.closest("button")).not.toBeDisabled()
  })

  it("should call onBack when clicking Voltar", async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    render(<ContactStep {...defaultProps} onBack={onBack} />)

    await user.click(screen.getByText("Voltar"))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it("should call onChangeNotes for paid mentoring", async () => {
    const onChangeNotes = vi.fn()
    const user = userEvent.setup()
    render(
      <ContactStep
        {...defaultProps}
        mentoringType="paid"
        onChangeNotes={onChangeNotes}
      />,
    )

    await user.type(screen.getByPlaceholderText(/abordar na mentoria/), "R")
    expect(onChangeNotes).toHaveBeenCalled()
  })
})
