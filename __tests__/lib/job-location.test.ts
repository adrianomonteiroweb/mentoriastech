import { describe, expect, it } from "vitest"
import {
  normalizeCityKey,
  normalizeCountryCode,
  parseJobLocation,
} from "@/lib/job-location"

describe("normalizeCityKey", () => {
  it("colapsa as grafias da mesma cidade numa chave só", () => {
    expect(normalizeCityKey("São Paulo")).toBe("sao-paulo")
    expect(normalizeCityKey("Sao Paulo")).toBe("sao-paulo")
    expect(normalizeCityKey("  sao   paulo ")).toBe("sao-paulo")
    expect(normalizeCityKey("Belo Horizonte")).toBe("belo-horizonte")
  })

  it("devolve null para vazio", () => {
    expect(normalizeCityKey(null)).toBeNull()
    expect(normalizeCityKey("")).toBeNull()
    expect(normalizeCityKey("   ")).toBeNull()
  })
})

describe("parseJobLocation", () => {
  it("quebra o formato completo do LinkedIn (cidade, estado, país)", () => {
    expect(parseJobLocation("São Paulo, São Paulo, Brasil")).toMatchObject({
      city: "São Paulo",
      cityKey: "sao-paulo",
      region: "SP",
      countryName: "Brasil",
      countryCode: "BR",
    })
  })

  it("normaliza o estado por extenso para a sigla", () => {
    expect(parseJobLocation("Fortaleza, Ceará, Brasil")).toMatchObject({
      city: "Fortaleza",
      region: "CE",
      countryCode: "BR",
    })
  })

  it("infere Brasil quando só vem cidade e estado", () => {
    expect(parseJobLocation("Curitiba, Paraná")).toMatchObject({
      city: "Curitiba",
      region: "PR",
      countryName: "Brasil",
      countryCode: "BR",
    })
  })

  it("resolve país internacional", () => {
    expect(parseJobLocation("Lisboa, Portugal")).toMatchObject({
      city: "Lisboa",
      countryName: "Portugal",
      countryCode: "PT",
      region: null,
    })
    expect(parseJobLocation("Austin, Texas, United States")).toMatchObject({
      city: "Austin",
      region: "Texas",
      countryCode: "US",
    })
  })

  it("captura a modalidade do parêntese final sem sujar a cidade", () => {
    const parsed = parseJobLocation("United States (Remote)")
    expect(parsed.workModelHint).toBe("remote")
    expect(parsed.countryCode).toBe("US")
    expect(parsed.city).toBeNull()

    expect(parseJobLocation("Belo Horizonte, Minas Gerais (Híbrido)")).toMatchObject({
      city: "Belo Horizonte",
      region: "MG",
      workModelHint: "hybrid",
    })
    expect(parseJobLocation("Rio de Janeiro, RJ (Presencial)").workModelHint).toBe(
      "onsite",
    )
  })

  it("trata marcador supranacional como ausência de país, não como cidade", () => {
    expect(parseJobLocation("América Latina")).toMatchObject({
      city: null,
      countryCode: null,
      countryName: null,
    })
    expect(parseJobLocation("Remoto")).toMatchObject({ city: null, countryCode: null })
    expect(parseJobLocation("Worldwide")).toMatchObject({ city: null, countryCode: null })
  })

  it("não deixa o país virar cidade", () => {
    expect(parseJobLocation("Remoto, Brasil")).toMatchObject({
      city: null,
      countryCode: "BR",
    })
    expect(parseJobLocation("Brasil").city).toBeNull()
  })

  // Esta é a guarda que justifica o parser existir: sem separador "·" na página,
  // o bot manda a descrição inteira no lugar da localidade.
  it("descarta blob de texto em vez de criar uma cidade lixo", () => {
    const blob = "Estamos procurando pessoa desenvolvedora ".repeat(10)
    expect(parseJobLocation(blob)).toMatchObject({
      city: null,
      cityKey: null,
      countryCode: null,
    })
  })

  it("descarta prosa curta com pontuação de frase", () => {
    expect(parseJobLocation("Venha trabalhar com a gente. Vaga aberta").city).toBeNull()
  })

  it("corta o ruído que o LinkedIn cola na mesma linha", () => {
    expect(
      parseJobLocation("São Paulo, São Paulo, Brasil · Há 2 dias · 30 candidatos"),
    ).toMatchObject({ city: "São Paulo", region: "SP", countryCode: "BR" })
  })

  it("usa is_international como desempate quando o país não resolve", () => {
    expect(parseJobLocation("Barueri", { isInternational: false })).toMatchObject({
      city: "Barueri",
      countryCode: "BR",
    })
    expect(parseJobLocation("Barueri", { isInternational: true }).countryCode).toBeNull()
    expect(parseJobLocation("Barueri").countryCode).toBeNull()
  })

  it("devolve tudo nulo para entrada vazia", () => {
    expect(parseJobLocation(null)).toMatchObject({ city: null, countryCode: null })
    expect(parseJobLocation("")).toMatchObject({ city: null, countryCode: null })
  })
})

describe("normalizeCountryCode", () => {
  it("aceita ISO-2 em qualquer caixa", () => {
    expect(normalizeCountryCode("br")).toBe("BR")
    expect(normalizeCountryCode(" Us ")).toBe("US")
  })

  it("rejeita o que não for ISO-2", () => {
    expect(normalizeCountryCode("BRA")).toBeNull()
    expect(normalizeCountryCode("1")).toBeNull()
    expect(normalizeCountryCode(null)).toBeNull()
  })
})
