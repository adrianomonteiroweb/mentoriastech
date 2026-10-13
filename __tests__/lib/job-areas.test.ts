import { describe, expect, it } from "vitest"
import {
  AREA_FAMILIES,
  AREA_SPECIALTIES,
  areaCatalog,
  getAreaFamilyLabel,
  getAreaSpecialtyLabel,
  inferInclusionTags,
  inferJobArea,
  inferJobLevel,
  normalizeAreaText,
} from "@/lib/job-areas"

function area(title: string, stackTags?: string[], legacyCategory?: string) {
  return inferJobArea({ title, stackTags, legacyCategory })
}

describe("integridade do catalogo", () => {
  it("nao tem chave de especialidade duplicada", () => {
    const keys = AREA_SPECIALTIES.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("toda especialidade aponta para uma familia existente", () => {
    const families = new Set(AREA_FAMILIES.map((f) => f.key))
    for (const specialty of AREA_SPECIALTIES) {
      expect(families.has(specialty.family)).toBe(true)
    }
  })

  it("so a familia `outros` fica sem especialidade", () => {
    for (const { family, specialties } of areaCatalog()) {
      if (family.key === "outros") expect(specialties).toHaveLength(0)
      else expect(specialties.length).toBeGreaterThan(0)
    }
  })
})

// A ordem das regras E a logica. Estes casos sao exatamente os que quebram
// quando alguem reordena AREA_RULES sem perceber.
describe("precedencia entre regras", () => {
  it("QA Engineer e qualidade, nao engenharia", () => {
    expect(area("QA Engineer").family).toBe("qualidade")
    expect(area("Analista de Testes Pleno").family).toBe("qualidade")
    expect(area("SDET").specialty).toBe("qa-automacao")
  })

  it("Product Designer e design, nao produto", () => {
    expect(area("Product Designer").family).toBe("design")
    expect(area("Product Designer").specialty).toBe("product-design")
    expect(area("Product Manager").family).toBe("produto")
  })

  it("Data Engineer e dados, nao engenharia", () => {
    expect(area("Data Engineer").family).toBe("dados")
    expect(area("Engenheiro de Dados Senior").specialty).toBe("engenharia-dados")
  })

  it("Security Engineer e seguranca, nao engenharia", () => {
    expect(area("Security Engineer").family).toBe("seguranca")
    expect(area("Pentester").specialty).toBe("pentest")
  })

  it("Sales Engineer e suporte, nao engenharia", () => {
    expect(area("Sales Engineer").family).toBe("suporte")
    expect(area("Solutions Engineer").specialty).toBe("solutions-engineer")
  })

  it("Engineering Manager e lideranca, nao engenharia", () => {
    expect(area("Engineering Manager").family).toBe("lideranca")
    expect(area("Tech Lead").specialty).toBe("tech-lead")
    expect(area("Head of Engineering").specialty).toBe("head")
  })

  it("Scrum Master e agil, nao produto", () => {
    expect(area("Scrum Master").family).toBe("agil")
    expect(area("Agile Coach").specialty).toBe("agile-coach")
  })

  it("Platform e ML Engineer nao caem no generico de engenharia", () => {
    expect(area("Platform Engineer").family).toBe("infra")
    expect(area("Machine Learning Engineer").family).toBe("ia")
    expect(area("Site Reliability Engineer").specialty).toBe("sre")
  })

  it("senior staff nao e lido como staff nem como senior", () => {
    expect(inferJobLevel("Senior Staff Software Engineer")).toBe("senior_staff")
    expect(inferJobLevel("Staff Engineer")).toBe("staff")
    expect(inferJobLevel("Senior Software Engineer")).toBe("senior")
  })
})

describe("cobertura de areas que nao existiam na taxonomia antiga", () => {
  const casos: [string, string][] = [
    ["UX Researcher", "ux-research"],
    ["UX Writer", "ux-writing"],
    ["Especialista em Design System", "design-system"],
    ["Site Reliability Engineer", "sre"],
    ["Analytics Engineer", "analytics-engineer"],
    ["MLOps Engineer", "mlops"],
    ["Prompt Engineer", "genai"],
    ["Consultor SAP ABAP", "sap"],
    ["Salesforce Developer", "salesforce"],
    ["Desenvolvedor RPA UiPath", "rpa"],
    ["Analista de Suporte Tecnico N2", "suporte-tecnico"],
    ["Developer Advocate", "devrel"],
    ["Technical Writer", "tech-writer"],
    ["Tech Recruiter", "tech-recruiter"],
    ["Game Developer Unity", "games"],
    ["Engenheiro de Sistemas Embarcados", "embarcado"],
    ["Blockchain Developer", "blockchain"],
    ["FinOps Analyst", "finops"],
    ["Product Ops", "product-ops"],
    ["Business Analyst", "analista-negocios"],
    ["DBA PostgreSQL", "dba"],
    ["Especialista em Acessibilidade", "acessibilidade"],
    ["Gerente de Projetos de TI", "gerente-projetos"],
    ["Analista de Governanca de Dados", "governanca-dados"],
    ["Customer Success Manager", "customer-success"],
  ]

  it.each(casos)("%s -> %s", (titulo, esperado) => {
    expect(area(titulo).specialty).toBe(esperado)
  })
})

// Casos reais que ja falharam uma vez. Cada linha aqui e um bug que a ordem
// das regras causou e que so apareceu rodando titulos de verdade.
describe("regressao: titulos reais que ja classificaram errado", () => {
  const casos: [string, string, string][] = [
    ["Especialista em Cibersegurança", "seguranca", "seguranca-geral"],
    ["Analista de Infraestrutura e Redes", "infra", "redes"],
    ["Técnico de Suporte Júnior", "suporte", "suporte-tecnico"],
    ["Recrutador Técnico de TI", "adjacentes", "tech-recruiter"],
    ["Engenheiro de Confiabilidade", "infra", "sre"],
    // "software" no fim do titulo puxava para o generico de engenharia
    ["Coordenador de Qualidade de Software", "qualidade", "qa-geral"],
    ["Analista de Testes Automatizados", "qualidade", "qa-automacao"],
    ["QA Tester Manual", "qualidade", "qa-manual"],
    // "automacao" sozinho e ambiguo: RPA tem de vencer QA
    ["Analista de Automação RPA", "plataformas", "rpa"],
    ["Pesquisadora de UX Sênior", "design", "ux-research"],
    // o ponto de ".NET" morre na normalizacao
    ["Desenvolvedor .NET Pleno", "engenharia", "backend"],
  ]

  it.each(casos)("%s -> %s / %s", (titulo, familia, especialidade) => {
    const resultado = area(titulo)
    expect(resultado.family).toBe(familia)
    expect(resultado.specialty).toBe(especialidade)
  })

  it("so titulo sem nenhuma pista de funcao cai em `outros`", () => {
    expect(area("Vaga para profissional de tecnologia").family).toBe("outros")
    expect(area("Oportunidade em nosso time").family).toBe("outros")
  })
})

describe("acento, caixa e idioma", () => {
  it("ignora acento e caixa", () => {
    expect(normalizeAreaText("Engenheiro de Software Sênior")).toBe(
      "engenheiro de software senior",
    )
    expect(area("DESENVOLVEDOR FRONT-END").specialty).toBe("frontend")
    expect(area("Cientista de Dados").specialty).toBe("ciencia-dados")
  })

  it("casa portugues e ingles para a mesma especialidade", () => {
    expect(area("Desenvolvedor Back-end").specialty).toBe("backend")
    expect(area("Backend Developer").specialty).toBe("backend")
    expect(area("Pesquisador UX").specialty).toBe("ux-research")
    expect(area("UX Researcher").specialty).toBe("ux-research")
  })

  it("casa so palavra inteira — nao casa dentro de outra palavra", () => {
    // "po" nao pode casar dentro de "pontos", "pm" nao pode casar em "pmo".
    expect(area("Analista de Pontos de Funcao").specialty).not.toBe("po")
    expect(area("Analista PMO").family).toBe("agil")
  })
})

describe("desempate por stack", () => {
  it("titulo generico decide pela stack", () => {
    const front = area("Desenvolvedor Pleno", ["react", "tailwind"])
    expect(front.specialty).toBe("frontend")
    expect(front.source).toBe("stack")
  })

  it("front + back na mesma vaga vira fullstack", () => {
    expect(area("Desenvolvedor", ["react", "nodejs"]).specialty).toBe("fullstack")
  })

  it("stack nao sobrepoe casamento especifico do titulo", () => {
    const qa = area("QA Automation Engineer", ["react"])
    expect(qa.specialty).toBe("qa-automacao")
    expect(qa.source).toBe("title")
  })
})

describe("fallback — nada pode sumir", () => {
  it("titulo irreconhecivel vai para `outros`, nao some", () => {
    const resultado = area("Oportunidade incrivel na nossa empresa")
    expect(resultado.family).toBe("outros")
    expect(resultado.specialty).toBeNull()
    expect(resultado.source).toBe("fallback")
  })

  it("titulo vazio nao lanca", () => {
    expect(() => inferJobArea({ title: null })).not.toThrow()
    expect(inferJobArea({ title: "" }).family).toBe("outros")
  })

  it("herda a categoria legada quando o titulo nao diz nada", () => {
    const resultado = area("Vaga aberta", undefined, "devops")
    expect(resultado.specialty).toBe("devops")
    expect(resultado.source).toBe("legacy")
  })
})

describe("inferencia de nivel", () => {
  it("le estagio e trainee como nivel, nao como area", () => {
    expect(inferJobLevel("Estagio em Desenvolvimento")).toBe("internship")
    expect(inferJobLevel("Trainee de Dados")).toBe("internship")
    expect(area("Estagio em Desenvolvimento").family).toBe("engenharia")
  })

  it("devolve null quando o titulo nao diz a senioridade", () => {
    expect(inferJobLevel("Desenvolvedor Front-end")).toBeNull()
  })

  it("cargo de lideranca implica senioridade mesmo sem a palavra", () => {
    expect(inferJobLevel("Tech Lead", "tech-lead")).toBe("senior")
    expect(inferJobLevel("Head of Data", "head")).toBe("principal")
  })
})

describe("eixo de inclusao", () => {
  // O bug que motivou separar os eixos: como categoria, `pcd` fazia a vaga
  // sumir do filtro da area.
  it("vaga PCD continua sendo da sua area", () => {
    const resultado = inferJobArea({
      title: "Desenvolvedor Front-end (PCD)",
      legacyCategory: "pcd",
    })
    expect(resultado.specialty).toBe("frontend")
    expect(
      inferInclusionTags({ title: "Desenvolvedor Front-end (PCD)", legacyCategory: "pcd" }),
    ).toContain("pcd")
  })

  it("migra as categorias afirmativas legadas", () => {
    expect(
      inferInclusionTags({ title: "Vaga", legacyCategory: "afirmativa_mulheres_tecnologia" }),
    ).toEqual(["mulheres"])
    expect(
      inferInclusionTags({ title: "Vaga", legacyCategory: "afirmativa_pessoas_pretas" }),
    ).toEqual(["pessoas-pretas"])
  })

  it("acumula mais de uma flag", () => {
    const tags = inferInclusionTags({
      title: "Pessoa Desenvolvedora (afirmativa para mulheres negras)",
    })
    expect(tags).toContain("mulheres")
    expect(tags).toContain("pessoas-pretas")
  })

  it("vaga sem marcador nao recebe flag", () => {
    expect(inferInclusionTags({ title: "Desenvolvedor Back-end Senior" })).toEqual([])
  })
})

describe("labels", () => {
  it("rotula familia e especialidade conhecidas", () => {
    expect(getAreaFamilyLabel("qualidade")).toBe("Qualidade")
    expect(getAreaSpecialtyLabel("ux-research")).toBe("UX Research")
  })

  it("chave desconhecida cai num title-case decente, sem quebrar", () => {
    expect(getAreaFamilyLabel("inexistente")).toBe("Outros")
    expect(getAreaSpecialtyLabel("algo-novo")).toBe("Algo Novo")
  })
})
