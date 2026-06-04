import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => (
    <img {...props} />
  ),
}))

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

import { AdForm } from "@/components/dashboard/admin/ad-form"
import { DEFAULT_AD_WHATSAPP_MESSAGE } from "@/lib/ad-whatsapp"

describe("AdForm", () => {
  it("offers image upload, alternative text, and WhatsApp action fields", () => {
    render(<AdForm />)

    expect(screen.getByLabelText("Imagem do anúncio")).toHaveAttribute("type", "file")
    expect(screen.getByLabelText("Texto alternativo da imagem")).toBeInTheDocument()
    expect(screen.getByLabelText("WhatsApp com país e DDD")).toBeInTheDocument()
    expect(screen.getByLabelText("Mensagem inicial do WhatsApp")).toHaveValue(
      DEFAULT_AD_WHATSAPP_MESSAGE,
    )
    expect(
      screen.getByText(/O botão do anúncio abrirá uma conversa nesse WhatsApp\./),
    ).toBeInTheDocument()
  })
})
