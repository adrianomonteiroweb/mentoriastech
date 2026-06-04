import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    priority: _priority,
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean
    priority?: boolean
    unoptimized?: boolean
  }) => <img {...props} />,
}))

import { AdBanner } from "@/components/ad-banner"

const ad = {
  id: "ad-1",
  title: "Inglês para profissionais de tecnologia",
  description: "Preparação para entrevistas e reuniões.",
  image_url: "https://example.com/ad.png",
  image_alt: "Arte com informações sobre aulas de inglês para profissionais de tecnologia.",
  whatsapp_number: "558588139289",
  whatsapp_message: "Olá, quero saber mais sobre as aulas",
  link_url: null,
}

describe("AdBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string | URL | Request) => {
        const url = String(input)

        if (url === "/api/ads") {
          return Promise.resolve({
            json: () => Promise.resolve({ data: [ad] }),
          })
        }

        return Promise.resolve({
          json: () => Promise.resolve({ success: true }),
        })
      }),
    )
  })

  it("renders the full-image action and accessible WhatsApp CTA", async () => {
    const user = userEvent.setup()
    render(<AdBanner />)

    expect(
      await screen.findByRole("heading", {
        name: "Inglês para profissionais de tecnologia",
      }),
    ).toBeInTheDocument()

    const whatsappLinks = screen.getAllByRole("link", { name: "Falar no WhatsApp" })
    expect(whatsappLinks).toHaveLength(2)
    whatsappLinks.forEach((link) => {
      expect(link).toHaveAttribute(
        "href",
        `https://wa.me/558588139289?text=${encodeURIComponent(ad.whatsapp_message)}`,
      )
    })

    const expandButton = screen.getByRole("button", {
      name: `Ampliar imagem. ${ad.image_alt}`,
    })
    await user.click(expandButton)

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
    expect(screen.getAllByAltText(ad.image_alt)).toHaveLength(2)
  })

  it("removes the ad after a click reaches its limit", async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockImplementation((input: string | URL | Request) => {
      const url = String(input)

      if (url === "/api/ads") {
        return Promise.resolve({
          json: () => Promise.resolve({ data: [ad] }),
        } as Response)
      }

      return Promise.resolve({
        json: () => Promise.resolve({
          success: true,
          data: { click_count: 1, max_clicks: 1, is_active: false },
        }),
      } as Response)
    })

    render(<AdBanner />)

    const links = await screen.findAllByRole("link", { name: "Falar no WhatsApp" })
    await user.click(links[0])

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: ad.title }),
      ).not.toBeInTheDocument()
    })
  })
})
