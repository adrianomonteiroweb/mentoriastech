import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { BookingStepper } from "@/components/booking/booking-stepper"

describe("BookingStepper", () => {
  it("should render progress bar and step label for 5-step free flow", () => {
    render(
      <BookingStepper
        steps={["Tipo", "Tema", "Data e horário", "Seus dados", "Confirmação"]}
        currentStep={0}
        direction="forward"
      >
        <div>Step content</div>
      </BookingStepper>,
    )

    expect(screen.getByText("Passo 1 de 5")).toBeInTheDocument()
    expect(screen.getByText("Tipo")).toBeInTheDocument()
    expect(screen.getByText("Step content")).toBeInTheDocument()
  })

  it("should render progress bar for 6-step paid flow", () => {
    render(
      <BookingStepper
        steps={["Tipo", "Tema", "Data e horário", "Seus dados", "Revisão", "Pagamento"]}
        currentStep={0}
        direction="forward"
      >
        <div>Step content</div>
      </BookingStepper>,
    )

    expect(screen.getByText("Passo 1 de 6")).toBeInTheDocument()
  })

  it("should show correct step at step 3", () => {
    render(
      <BookingStepper
        steps={["Tipo", "Tema", "Data e horário", "Seus dados", "Confirmação"]}
        currentStep={2}
        direction="forward"
      >
        <div>DateTime content</div>
      </BookingStepper>,
    )

    expect(screen.getByText("Passo 3 de 5")).toBeInTheDocument()
    expect(screen.getByText("Data e horário")).toBeInTheDocument()
    expect(screen.getByText("DateTime content")).toBeInTheDocument()
  })

  it("should render numbered step indicators on desktop", () => {
    render(
      <BookingStepper
        steps={["Tipo", "Tema", "Data e horário", "Seus dados", "Confirmação"]}
        currentStep={2}
        direction="forward"
      >
        <div>Content</div>
      </BookingStepper>,
    )

    // Check step numbers exist (they are rendered but hidden on mobile via sm:flex)
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("should render children", () => {
    render(
      <BookingStepper
        steps={["A", "B"]}
        currentStep={0}
        direction="forward"
      >
        <p>Custom child content</p>
      </BookingStepper>,
    )

    expect(screen.getByText("Custom child content")).toBeInTheDocument()
  })
})
