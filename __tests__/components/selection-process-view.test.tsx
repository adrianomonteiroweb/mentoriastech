import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/components/shared/checklist-popover", () => ({
  ChecklistPopover: () => <button type="button">0/16 pontos</button>,
}))

import { SelectionProcessView } from "@/components/shared/selection-process-view"

const sharedProcess = {
  id: "process-1",
  company: "Empresa",
  position: "Desenvolvimento",
  description: null,
  status: "open",
  candidates: [
    {
      id: "candidate-1",
      process_id: "process-1",
      mentee_id: "mentee-1",
      score: 0,
      checklist: [],
      notes: null,
      profiles: {
        full_name: "Maria Silva",
        email: "maria@example.com",
        whatsapp: "(85) 99999-9999",
        linkedin_url: null,
        portfolio_url: null,
        resume_url: null,
      },
    },
  ],
}

describe("SelectionProcessView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({
        json: () => Promise.resolve({ data: sharedProcess, permission: "view" }),
      } as Response)),
    )
  })

  it("copia o email e abre o WhatsApp do candidato", async () => {
    const user = userEvent.setup()
    render(<SelectionProcessView token="shared-token" />)

    const whatsappLinks = await screen.findAllByRole("link", {
      name: "Abrir WhatsApp de Maria Silva",
    })
    expect(whatsappLinks).toHaveLength(2)
    whatsappLinks.forEach((whatsappLink) => {
      expect(whatsappLink).toHaveAttribute("href", "https://wa.me/5585999999999")
      expect(whatsappLink).toHaveAttribute("target", "_blank")
    })

    expect(screen.getByTestId("selection-process-mobile-list")).toHaveClass("md:hidden")
    expect(screen.getByTestId("selection-process-desktop-table")).toHaveClass("hidden", "md:block")

    const copyButtons = screen.getAllByRole("button", { name: "Copiar email de Maria Silva" })
    expect(copyButtons).toHaveLength(2)
    await user.click(copyButtons[0])

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Email copiado" })).toHaveLength(2)
    })
    expect(await navigator.clipboard.readText()).toBe("maria@example.com")
  })
})
