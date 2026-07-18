import { describe, expect, it } from "vitest"
import {
  formatWhatsAppNumber,
  normalizePhoneNumber,
  phoneNumberForInput,
} from "@/lib/whatsapp"

describe("WhatsApp internacional", () => {
  it("mantém um número de Cabo Verde em E.164", () => {
    expect(normalizePhoneNumber("+2389841098")).toBe("+2389841098")
    expect(formatWhatsAppNumber("+2389841098")).toBe("2389841098")
  })

  it("mantém compatibilidade com números brasileiros sem DDI", () => {
    expect(phoneNumberForInput("85986663753")).toBe("+5585986663753")
    expect(formatWhatsAppNumber("(85) 98666-3753")).toBe("5585986663753")
  })

  it("rejeita números que não pertencem ao plano selecionado", () => {
    expect(normalizePhoneNumber("+238123")).toBeNull()
  })
})
