import { describe, expect, it } from "vitest"
import { createPagarmeClient, modeFromSecretKey, resolveBaseUrl } from "@/lib/pagarme"
import { classifyPagarmeError } from "@/lib/pagarme/errors"

const CANONICAL = "https://api.pagar.me/core/v5"

describe("resolveBaseUrl (host unico v5, previne o 404 do gateway)", () => {
  it("usa o host canonico quando nao ha baseUrl (qualquer ambiente)", () => {
    expect(resolveBaseUrl("sk_test_abc")).toBe(CANONICAL)
    expect(resolveBaseUrl("sk_live_abc")).toBe(CANONICAL)
    expect(resolveBaseUrl("sk_abc")).toBe(CANONICAL)
  })

  it("normaliza o sdx-api morto para o host canonico (o bug do 404)", () => {
    expect(resolveBaseUrl("sk_test_x", "https://sdx-api.pagar.me/core/v5")).toBe(CANONICAL)
    expect(resolveBaseUrl("sk_test_x", "https://sdx-api.pagar.me")).toBe(CANONICAL)
  })

  it("corrige hosts pagar.me sem /core/v5, com sufixos ou barra final", () => {
    expect(resolveBaseUrl("sk_test_x", "https://api.pagar.me")).toBe(CANONICAL)
    expect(resolveBaseUrl("sk_test_x", "https://api.pagar.me/core/v5/orders")).toBe(CANONICAL)
    expect(resolveBaseUrl("sk_test_x", "https://api.pagar.me/core/v5/")).toBe(CANONICAL)
  })

  it("mantem o host canonico intacto", () => {
    expect(resolveBaseUrl("sk_test_x", CANONICAL)).toBe(CANONICAL)
  })

  it("respeita um host de proxy nao-pagar.me como informado", () => {
    expect(resolveBaseUrl("sk_test_x", "https://proxy.example.com/pagarme")).toBe(
      "https://proxy.example.com/pagarme",
    )
  })

  it("cai para o host canonico quando o valor e invalido", () => {
    expect(resolveBaseUrl("sk_test_x", "isto nao e uma url")).toBe(CANONICAL)
  })
})

describe("modeFromSecretKey", () => {
  it("detecta teste vs producao (sk e pk)", () => {
    expect(modeFromSecretKey("sk_test_abc")).toBe("test")
    expect(modeFromSecretKey("pk_test_abc")).toBe("test")
    expect(modeFromSecretKey("sk_live_abc")).toBe("live")
    expect(modeFromSecretKey("sk_abc")).toBe("live")
  })
})

describe("createPagarmeClient", () => {
  it("rejeita uma chave publica (pk_...) com erro de configuracao", () => {
    expect(() => createPagarmeClient({ secretKey: "pk_test_abc" })).toThrowError(/PUBLICA|sk_/)
  })

  it("aceita uma secret key valida", () => {
    expect(() => createPagarmeClient({ secretKey: "sk_test_abc" })).not.toThrow()
  })
})

describe("classifyPagarmeError", () => {
  it("classifica o 404 do gateway (Kong) como gateway_route", () => {
    expect(classifyPagarmeError(404, "no Route matched with those values")).toBe("gateway_route")
  })

  it("classifica erros de auth e de documento", () => {
    expect(classifyPagarmeError(401, "Unauthorized")).toBe("auth")
    expect(classifyPagarmeError(422, "The customer document is required.")).toBe("document")
  })
})
