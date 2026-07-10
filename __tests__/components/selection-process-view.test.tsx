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

    const whatsappLink = await screen.findByRole("link", {
      name: "Abrir WhatsApp de Maria Silva",
    })
    expect(whatsappLink).toHaveAttribute("href", "https://wa.me/5585999999999")
    expect(whatsappLink).toHaveAttribute("target", "_blank")

    await user.click(screen.getByRole("button", { name: "Copiar email de Maria Silva" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Email copiado" })).toBeInTheDocument()
    })
    expect(await navigator.clipboard.readText()).toBe("maria@example.com")
  })
})
