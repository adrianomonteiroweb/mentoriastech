import { describe, expect, it } from "vitest"
import { optionalWhatsAppSchema, requiredWhatsAppSchema } from "@/lib/whatsapp-schema"

describe("schemas de WhatsApp", () => {
  it("normaliza Brasil legado e aceita Cabo Verde", () => {
    expect(requiredWhatsAppSchema.parse("(85) 98666-3753")).toBe("+5585986663753")
    expect(requiredWhatsAppSchema.parse("+2389841098")).toBe("+2389841098")
  })

  it("permite limpar campos opcionais e rejeita número inválido", () => {
    expect(optionalWhatsAppSchema.parse("")).toBe("")
    expect(requiredWhatsAppSchema.safeParse("+238123").success).toBe(false)
  })
})
