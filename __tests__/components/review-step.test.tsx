import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ReviewStep } from "@/components/booking/steps/review-step"
import { initialBookingState } from "@/lib/types/booking"

describe("ReviewStep — free booking", () => {
  const freeState = {
    ...initialBookingState,
    mentoringType: "free" as const,
    topicName: "Carreira em programação",
    sessionDate: "2026-04-10",
    startTime: "20:00",
    dayName: "Sexta-feira",
    name: "Maria Teste",
    email: "maria@test.com",
    whatsapp: "5585999990000",
  }

  it("should render all review sections", () => {
    render(
      <ReviewStep
        state={freeState}
        onGoToStep={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText("Mentoria Gratuita")).toBeInTheDocument()
    expect(screen.getByText("Carreira em programação")).toBeInTheDocument()
    expect(screen.getByText(/Sexta-feira.*10\/04\/2026/)).toBeInTheDocument()
    expect(screen.getByText("20:00")).toBeInTheDocument()
    expect(screen.getByText("Maria Teste")).toBeInTheDocument()
  })

  it("should show 'Solicitar mentoria' as submit button", () => {
    render(
      <ReviewStep
        state={freeState}
        onGoToStep={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText("Solicitar mentoria")).toBeInTheDocument()
  })

  it("should call onSubmit when clicking submit button", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <ReviewStep
        state={freeState}
        onGoToStep={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByText("Solicitar mentoria"))
    expect(onSubmit).toHaveBeenCalled()
  })

  it("should call onGoToStep when clicking Alterar", async () => {
    const onGoToStep = vi.fn()
    const user = userEvent.setup()
    render(
      <ReviewStep
        state={freeState}
        onGoToStep={onGoToStep}
        onSubmit={vi.fn()}
      />,
    )

    const editButtons = screen.getAllByText("Alterar")
    // First "Alterar" is for Tipo (step 0)
    await user.click(editButtons[0])
    expect(onGoToStep).toHaveBeenCalledWith(0)
  })

  it("should show error message when status is error", () => {
    const errorState = {
      ...freeState,
      status: "error" as const,
      errorMsg: "Erro ao enviar solicitação",
    }
    render(
      <ReviewStep
        state={errorState}
        onGoToStep={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText("Erro ao enviar solicitação")).toBeInTheDocument()
  })
})

describe("ReviewStep — paid booking", () => {
  const paidState = {
    ...initialBookingState,
    mentoringType: "paid" as const,
    topicName: "Aulas de Next.js",
    sessionDate: "2026-04-15",
    startTime: "14:00",
    dayName: "Quarta-feira",
    name: "João Teste",
    email: "joao@test.com",
    whatsapp: "5585999990002",
  }

  it("should show 'Solicitar mentoria' button for paid booking", () => {
    render(
      <ReviewStep
        state={paidState}
        onGoToStep={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText("Solicitar mentoria")).toBeInTheDocument()
  })

  it("should call onSubmit when clicking submit button for paid booking", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <ReviewStep
        state={paidState}
        onGoToStep={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByText("Solicitar mentoria"))
    expect(onSubmit).toHaveBeenCalled()
  })

  it("should show notes when present", () => {
    const stateWithNotes = { ...paidState, notes: "Quero aprender SSR" }
    render(
      <ReviewStep
        state={stateWithNotes}
        onGoToStep={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText("Quero aprender SSR")).toBeInTheDocument()
  })
})
