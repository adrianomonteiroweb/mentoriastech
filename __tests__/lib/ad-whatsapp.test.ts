import { describe, expect, it } from "vitest"
import {
  buildAdWhatsAppUrl,
  DEFAULT_AD_WHATSAPP_MESSAGE,
} from "@/lib/ad-whatsapp"

describe("buildAdWhatsAppUrl", () => {
  it("uses the default message when no custom message is provided", () => {
    expect(buildAdWhatsAppUrl("85999999999")).toBe(
      `https://wa.me/5585999999999?text=${encodeURIComponent(DEFAULT_AD_WHATSAPP_MESSAGE)}`,
    )
  })

  it("uses the admin-provided message", () => {
    expect(buildAdWhatsAppUrl("558588139289", "Quero conhecer as aulas")).toBe(
      `https://wa.me/558588139289?text=${encodeURIComponent("Quero conhecer as aulas")}`,
    )
  })
})
