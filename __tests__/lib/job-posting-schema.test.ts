import { describe, expect, it } from "vitest"
import { buildJobPostingSchema } from "@/lib/job-posting-schema"
import type { JobDetail } from "@/lib/db/job-listing"

const URL = "https://exemplo.com/jobs/abc"

function job(overrides: Partial<JobDetail> = {}): JobDetail {
  return {
    id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    title: "Desenvolvedora Front-end Sênior",
    company: "Empresa X",
    description: "Trabalhar com React.\n\nTime distribuído.",
    description_en: null,
    stack_tags: ["react", "typescript"],
    recommendation_note: null,
    location: "São Paulo, Brasil",
    city: "São Paulo",
    region: "São Paulo",
    country_name: "Brasil",
    country_code: "BR",
    job_type: "remote",
    level: "senior",
    level_inferred: false,
    category: "desenvolvimento",
    area_family: "engenharia",
    area_specialty: "frontend",
    inclusion_tags: [],
    salary_range: null,
    application_url: "https://empresa.com/vaga",
    is_international: false,
    required_language: null,
    language_level: null,
    summary: null,
    important_note: null,
    like_count: 0,
    source_posted_at: "2026-10-10T12:00:00.000Z",
    created_at: "2026-10-10T12:00:00.000Z",
    updated_at: "2026-10-10T12:00:00.000Z",
    expires_at: null,
    view_count: 0,
    posted_by_name: null,
    ...overrides,
  }
}

describe("campos obrigatorios do Google", () => {
  it("tem tipo, titulo, descricao e data", () => {
    const s = buildJobPostingSchema(job(), URL)
    expect(s["@type"]).toBe("JobPosting")
    expect(s.title).toBeTruthy()
    expect(s.description).toBeTruthy()
    expect(s.datePosted).toBe("2026-10-10T12:00:00.000Z")
  })

  it("descricao sai em HTML, com paragrafos", () => {
    const s = buildJobPostingSchema(job(), URL)
    expect(s.description).toContain("<p>")
    expect(s.description).toContain("Trabalhar com React.")
    expect(s.description).toContain("Time distribuído.")
  })

  // Descricao raspada da origem pode trazer < e & soltos, que quebrariam o
  // JSON-LD inteiro — e um JSON-LD invalido nao indexa nada.
  it("escapa HTML vindo da descricao", () => {
    const s = buildJobPostingSchema(
      job({ description: "C++ & <script>alert(1)</script> templates" }),
      URL,
    )
    expect(s.description).not.toContain("<script>")
    expect(s.description).toContain("&lt;script&gt;")
    expect(s.description).toContain("&amp;")
  })

  it("vaga sem descricao nao fica com campo vazio", () => {
    const s = buildJobPostingSchema(job({ description: null, description_en: null }), URL)
    expect(s.description).toContain("Desenvolvedora Front-end Sênior")
  })
})

describe("remoto x presencial", () => {
  // Remota sem applicantLocationRequirements o Google rejeita ou assume o
  // mundo inteiro — que e justamente o que nao queremos numa vaga BR.
  it("remota nacional declara TELECOMMUTE e restringe ao Brasil", () => {
    const s = buildJobPostingSchema(job(), URL)
    expect(s.jobLocationType).toBe("TELECOMMUTE")
    expect(s.applicantLocationRequirements).toEqual({
      "@type": "Country",
      name: "Brasil",
    })
  })

  it("remota internacional usa o pais da vaga", () => {
    const s = buildJobPostingSchema(
      job({ is_international: true, country_code: "PT", country_name: "Portugal" }),
      URL,
    )
    expect(s.applicantLocationRequirements).toMatchObject({ name: "Portugal" })
  })

  it("presencial manda jobLocation e nao manda TELECOMMUTE", () => {
    const s = buildJobPostingSchema(job({ job_type: "onsite" }), URL)
    expect(s.jobLocationType).toBeUndefined()
    expect(s.jobLocation).toMatchObject({
      "@type": "Place",
      address: { addressLocality: "São Paulo", addressCountry: "BR" },
    })
  })

  it("sem localidade conhecida nao inventa um Place", () => {
    const s = buildJobPostingSchema(
      job({ job_type: "onsite", city: null, region: null, country_name: null }),
      URL,
    )
    expect(s.jobLocation).toBeUndefined()
  })
})

describe("validThrough", () => {
  // Data no passado REMOVE a vaga do indice. Omitir e melhor que chutar.
  it("omite quando a vaga ja expirou", () => {
    const s = buildJobPostingSchema(job({ expires_at: "2020-01-01T00:00:00.000Z" }), URL)
    expect(s.validThrough).toBeUndefined()
  })

  it("omite quando nao ha data de expiracao", () => {
    expect(buildJobPostingSchema(job(), URL).validThrough).toBeUndefined()
  })

  it("inclui quando a data ainda e futura", () => {
    const futuro = new Date(Date.now() + 86_400_000).toISOString()
    expect(buildJobPostingSchema(job({ expires_at: futuro }), URL).validThrough).toBe(futuro)
  })
})

describe("empresa e candidatura", () => {
  // Dizer que a MentoriasTech contrata seria falso: ela faz a curadoria.
  it("sem empresa identificada, nao inventa uma contratante", () => {
    const s = buildJobPostingSchema(job({ company: null }), URL)
    expect(s.hiringOrganization).toBeUndefined()
  })

  it("com empresa, declara a contratante", () => {
    const s = buildJobPostingSchema(job(), URL)
    expect(s.hiringOrganization).toEqual({ "@type": "Organization", name: "Empresa X" })
  })

  // A candidatura acontece na origem: marcar directApply sem ter formulario
  // proprio e um dos erros que o Google pune.
  it("declara directApply false", () => {
    expect(buildJobPostingSchema(job(), URL).directApply).toBe(false)
  })
})

describe("campos complementares", () => {
  it("leva stacks, area e nivel", () => {
    const s = buildJobPostingSchema(job(), URL)
    expect(s.skills).toBe("react, typescript")
    expect(s.occupationalCategory).toBe("Front-end")
    expect(s.experienceRequirements).toMatchObject({ description: "Sênior" })
  })

  it("serializa em JSON valido", () => {
    expect(() => JSON.stringify(buildJobPostingSchema(job(), URL))).not.toThrow()
  })
})
