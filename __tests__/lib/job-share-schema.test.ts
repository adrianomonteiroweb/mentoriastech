import { describe, expect, it } from "vitest"
import { jobShareSchema } from "@/lib/job-validation"

const base = {
  title: "Desenvolvedor Node Júnior",
  application_url: "https://www.linkedin.com/jobs/view/123/",
  recommendation_note: "Vaga remota encontrada no LinkedIn.",
}

describe("jobShareSchema", () => {
  it("aceita a indicação enxuta (sem enriquecimento) e aplica defaults", () => {
    const parsed = jobShareSchema.parse(base)
    expect(parsed.active_hours).toBe(0)
    expect(parsed.is_international).toBe(false)
    expect(parsed.description).toBeUndefined()
    expect(parsed.stack_tags).toBeUndefined()
    expect(parsed.job_type).toBeUndefined()
  })

  it("aceita os campos enriquecidos do bot de busca", () => {
    const parsed = jobShareSchema.parse({
      ...base,
      description: "Trabalhamos com Node.js, TypeScript e PostgreSQL.",
      location: "São Paulo, Brasil",
      stack_tags: ["node", "typescript", "postgresql"],
      job_type: "hybrid",
      salary_range: "R$ 5.000 a R$ 7.000",
      level: "junior",
      required_language: "english",
      language_level: "intermediate",
      is_international: false,
    })

    expect(parsed.stack_tags).toEqual(["node", "typescript", "postgresql"])
    expect(parsed.job_type).toBe("hybrid")
    expect(parsed.salary_range).toBe("R$ 5.000 a R$ 7.000")
    expect(parsed.level).toBe("junior")
    expect(parsed.required_language).toBe("english")
    expect(parsed.language_level).toBe("intermediate")
  })

  it("rejeita job_type fora do enum remote|hybrid|onsite", () => {
    const result = jobShareSchema.safeParse({ ...base, job_type: "presencial" })
    expect(result.success).toBe(false)
  })

  it("rejeita chaves desconhecidas (schema strict)", () => {
    const result = jobShareSchema.safeParse({ ...base, foo: "bar" })
    expect(result.success).toBe(false)
  })

  it("aceita descrição exatamente no limite (10k) — o bot trunca nesse tamanho", () => {
    const result = jobShareSchema.safeParse({
      ...base,
      description: "a".repeat(10000),
    })
    expect(result.success).toBe(true)
  })

  it("rejeita descrição acima do limite (10k)", () => {
    const result = jobShareSchema.safeParse({
      ...base,
      description: "a".repeat(10001),
    })
    expect(result.success).toBe(false)
  })
})
