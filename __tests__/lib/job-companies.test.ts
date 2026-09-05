import { describe, expect, it } from "vitest"
import {
  normalizeCompanyKey,
  parseLinkedInCompanySlug,
  resolveCompanyIdentity,
} from "@/lib/job-companies"

describe("normalizeCompanyKey", () => {
  it("funde as variações da mesma empresa", () => {
    const google = normalizeCompanyKey("Google")
    expect(normalizeCompanyKey("Google LLC")).toBe(google)
    expect(normalizeCompanyKey("Google Brasil")).toBe(google)
    expect(normalizeCompanyKey("  google   ")).toBe(google)
    expect(normalizeCompanyKey("Nubank Ltda")).toBe(normalizeCompanyKey("Nubank"))
  })

  // O contraponto do teste acima: as listas de sufixos são curtas de propósito.
  // Se alguém adicionar um termo genérico ("song", "solutions", "tecnologia"),
  // este teste quebra — e é isso que queremos.
  it("NÃO funde empresas distintas que só compartilham o prefixo", () => {
    expect(normalizeCompanyKey("Accenture Song")).not.toBe(
      normalizeCompanyKey("Accenture"),
    )
    expect(normalizeCompanyKey("Stefanini Rafael")).not.toBe(
      normalizeCompanyKey("Stefanini"),
    )
    expect(normalizeCompanyKey("Nubank Tecnologia")).not.toBe(
      normalizeCompanyKey("Nubank"),
    )
  })

  it("remove acento e o ruído que o card do LinkedIn cola no nome", () => {
    expect(normalizeCompanyKey("Ambev Tech")).toBe("ambev-tech")
    expect(normalizeCompanyKey("Itaú Unibanco")).toBe("itau-unibanco")
    expect(normalizeCompanyKey("CI&T - Vagas Tech")).toBe("ci-t")
  })

  it("nunca reduz o nome a string vazia", () => {
    expect(normalizeCompanyKey("Co")).toBe("co")
    expect(normalizeCompanyKey("SA")).toBe("sa")
    expect(normalizeCompanyKey("Brasil")).toBe("brasil")
  })

  it("devolve vazio para entrada inútil", () => {
    expect(normalizeCompanyKey(null)).toBe("")
    expect(normalizeCompanyKey("   ")).toBe("")
    expect(normalizeCompanyKey("***")).toBe("")
  })
})

describe("parseLinkedInCompanySlug", () => {
  it("extrai o slug da URL da empresa", () => {
    expect(parseLinkedInCompanySlug("https://www.linkedin.com/company/nubank/")).toBe(
      "nubank",
    )
    expect(
      parseLinkedInCompanySlug("https://br.linkedin.com/company/Ambev-Tech?trk=abc"),
    ).toBe("ambev-tech")
  })

  it("rejeita host de fora, placeholder e id numérico", () => {
    expect(parseLinkedInCompanySlug("https://example.com/company/nubank/")).toBeNull()
    expect(
      parseLinkedInCompanySlug("https://www.linkedin.com/company/unavailable/"),
    ).toBeNull()
    expect(parseLinkedInCompanySlug("https://www.linkedin.com/company/1441/")).toBeNull()
    expect(parseLinkedInCompanySlug("https://www.linkedin.com/jobs/view/123/")).toBeNull()
  })

  it("não lança em URL inválida", () => {
    expect(parseLinkedInCompanySlug("nao é url")).toBeNull()
    expect(parseLinkedInCompanySlug(null)).toBeNull()
  })
})

describe("resolveCompanyIdentity", () => {
  it("usa o slug do LinkedIn como chave forte quando existe", () => {
    const identity = resolveCompanyIdentity(
      "Nubank",
      "https://www.linkedin.com/company/nubank/",
    )
    expect(identity).toMatchObject({
      name: "Nubank",
      slug: "nubank",
      linkedinSlug: "nubank",
      linkedinUrl: "https://www.linkedin.com/company/nubank/",
    })
  })

  it("cai no nome normalizado quando não há company_url", () => {
    const identity = resolveCompanyIdentity("Nubank Ltda", null)
    expect(identity?.slug).toBe("nubank")
    expect(identity?.linkedinSlug).toBeNull()
  })

  it("resolve as duas grafias para o mesmo slug", () => {
    const a = resolveCompanyIdentity("Google LLC", null)
    const b = resolveCompanyIdentity("Google Brasil", null)
    expect(a?.slug).toBe(b?.slug)
  })

  it("devolve null quando não há empresa aproveitável", () => {
    expect(resolveCompanyIdentity(null, null)).toBeNull()
    expect(resolveCompanyIdentity("   ", null)).toBeNull()
  })
})
