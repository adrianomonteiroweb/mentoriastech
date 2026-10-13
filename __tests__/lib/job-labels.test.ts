import { describe, expect, it } from "vitest"
import {
  JOB_LEVEL_LABELS,
  JOB_LEVEL_ORDER,
  JOB_LEVEL_SHORT_LABELS,
  JOB_TYPE_LABELS,
  getJobLevelLabel,
  getJobTypeLabel,
  getLanguageLevelLabel,
  jobLevelOptions,
} from "@/lib/job-labels"
import { JOB_LEVELS } from "@/lib/job-areas"

describe("cobertura", () => {
  it("rotula todos os niveis que o banco aceita", () => {
    for (const level of JOB_LEVELS) {
      expect(JOB_LEVEL_LABELS[level]).toBeTruthy()
      expect(JOB_LEVEL_SHORT_LABELS[level]).toBeTruthy()
    }
  })

  it("a ordem de niveis bate com a do catalogo de areas", () => {
    expect([...JOB_LEVEL_ORDER]).toEqual([...JOB_LEVELS])
  })

  it("cobre as tres modalidades", () => {
    expect(Object.keys(JOB_TYPE_LABELS).sort()).toEqual(["hybrid", "onsite", "remote"])
  })
})

// Estes rotulos ja divergiram de verdade entre 14 arquivos: "Estágio & Trainee"
// x "Estágio" x "Estagio", "Senior Staff" x "Sênior Staff". Os testes abaixo
// existem para a divergencia nao voltar sem alguem perceber.
describe("regressao de divergencia", () => {
  it("acentos preservados em pt-BR", () => {
    expect(JOB_LEVEL_LABELS.junior).toBe("Júnior")
    expect(JOB_LEVEL_LABELS.senior).toBe("Sênior")
    expect(JOB_LEVEL_LABELS.senior_staff).toBe("Sênior Staff")
    expect(JOB_LEVEL_LABELS.internship).toContain("Estágio")
    expect(JOB_TYPE_LABELS.hybrid).toBe("Híbrido")
  })

  it("a versao curta so difere onde a longa nao caberia", () => {
    const diferentes = JOB_LEVEL_ORDER.filter(
      (k) => JOB_LEVEL_LABELS[k] !== JOB_LEVEL_SHORT_LABELS[k],
    )
    expect(diferentes).toEqual(["internship"])
    expect(JOB_LEVEL_SHORT_LABELS.internship).toBe("Estágio")
  })
})

describe("getters", () => {
  it("chave desconhecida volta como veio, nunca vazia", () => {
    expect(getJobLevelLabel("nivel_novo")).toBe("nivel_novo")
    expect(getJobTypeLabel("anywhere")).toBe("anywhere")
  })

  it("nulo vira string vazia em vez de 'undefined' na tela", () => {
    expect(getJobLevelLabel(null)).toBe("")
    expect(getJobTypeLabel(undefined)).toBe("")
    expect(getLanguageLevelLabel(null)).toBe("")
  })

  it("nivel de idioma desconhecido sai em caixa alta", () => {
    expect(getLanguageLevelLabel("b1")).toBe("B1")
    expect(getLanguageLevelLabel("n5")).toBe("N5")
  })

  it("as opcoes saem na ordem de carreira", () => {
    expect(jobLevelOptions().map((o) => o.key)).toEqual([...JOB_LEVEL_ORDER])
    expect(jobLevelOptions(true)[0].label).toBe("Estágio")
  })
})
