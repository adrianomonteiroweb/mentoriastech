/**
 * Tipos e normalização do plano de estudos gerado por IA a partir de uma vaga.
 *
 * Convenção do projeto: o schema é imposto via prompt + `responseMimeType:
 * "application/json"` e validado defensivamente aqui (JSON.parse + coerção),
 * no mesmo estilo de `normalizeRequirements` em `lib/ai/gemini.ts`. Nada de
 * `responseSchema` (não usado em nenhum lugar do código hoje).
 *
 * O shape reproduz fielmente as 5 abas da planilha de referência
 * (plano_estudos_laravel_junior.xlsx): Visão geral, Plano semanal,
 * Requisitos da vaga, Projeto final e Rotina semanal.
 */

export type RequisitoTipo =
  | "Obrigatório"
  | "Diferencial"
  | "Bônus escolhido"
  | "Bônus adicional"

export type Prioridade = "Alta" | "Média" | "Baixa"

export interface StudyPlanVaga {
  titulo: string
  empresa: string
  local: string
  modelo: string
  link: string
  objetivo: string
}

export interface EtapaResumo {
  etapa: string
  horas: number
}

export interface StudyPlanRequisito {
  tipo: RequisitoTipo
  competencia: string
  ondeEstudar: string
  evidenciaPortfolio: string
}

export interface SemanaPlano {
  semana: number
  etapa: string
  foco: string
  baseLogicaConceitual: string
  tecnologiasFerramentas: string
  praticaSugerida: string
  entregavel: string
  horas: number
  requisitoRelacionado: string
}

export interface ProjetoTarefa {
  area: string
  tarefa: string
  prioridade: Prioridade
  competencia: string
}

export interface ProjetoFinal {
  descricao: string
  tarefas: ProjetoTarefa[]
}

export interface RotinaDia {
  dia: string
  bloco: string
  horas: number
  atividade: string
}

export interface StudyPlanIndicadores {
  semanas: number
  cargaTotalHoras: number
}

export interface StudyPlanData {
  vaga: StudyPlanVaga
  indicadores: StudyPlanIndicadores
  principiosDeExecucao: string[]
  etapasResumo: EtapaResumo[]
  requisitos: StudyPlanRequisito[]
  planoSemanal: SemanaPlano[]
  projetoFinal: ProjetoFinal
  rotinaSemanal: RotinaDia[]
}

// ---------------------------------------------------------------------------
// Helpers de coerção (entrada = unknown vinda do JSON.parse da IA)
// ---------------------------------------------------------------------------

const REQUISITO_TIPOS: RequisitoTipo[] = [
  "Obrigatório",
  "Diferencial",
  "Bônus escolhido",
  "Bônus adicional",
]
const PRIORIDADES: Prioridade[] = ["Alta", "Média", "Baixa"]

const DIAS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
]

const DEFAULT_PRINCIPIOS = [
  "Entender o problema antes de escrever qualquer código.",
  "Definir entradas, saídas, regras de negócio e casos extremos.",
  "Resolver exemplos manualmente antes de programar.",
  "Escrever pseudocódigo e pensar nos testes.",
  "Implementar a solução mais simples que funcione.",
  "Refatorar e saber explicar as decisões tomadas.",
]

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function str(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v.trim()
  if (typeof v === "number" && Number.isFinite(v)) return String(v)
  return fallback
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."))
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function oneOf<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  const s = str(v).toLowerCase()
  return allowed.find((a) => a.toLowerCase() === s) ?? fallback
}

/**
 * Valida e coage o JSON devolvido pela IA para o shape `StudyPlanData`.
 * - Renumera as semanas sequencialmente (não confia no índice da IA).
 * - Recalcula `indicadores` a partir de `planoSemanal` (aritmética não é da IA).
 * - Deriva `etapasResumo` do plano semanal quando a IA não fornece.
 * - Usa `opts.jobUrl` como link oficial da vaga (sobrepõe o extraído do texto).
 */
export function normalizeStudyPlanData(
  raw: unknown,
  opts: { jobUrl?: string; hoursPerWeek?: number } = {},
): StudyPlanData {
  const r = obj(raw)
  const vagaRaw = obj(r.vaga)
  const hpw = opts.hoursPerWeek && opts.hoursPerWeek > 0 ? opts.hoursPerWeek : 15

  const vaga: StudyPlanVaga = {
    titulo: str(vagaRaw.titulo, "Plano de estudos"),
    empresa: str(vagaRaw.empresa, "Não informada"),
    local: str(vagaRaw.local, "Não informado"),
    modelo: str(vagaRaw.modelo, "Não informado"),
    link: str(opts.jobUrl) || str(vagaRaw.link),
    objetivo: str(
      vagaRaw.objetivo,
      "Preparação para a vaga com lógica como base e tecnologias como ferramentas.",
    ),
  }

  const planoSemanal: SemanaPlano[] = arr(r.planoSemanal)
    .map((w, i): SemanaPlano => {
      const o = obj(w)
      return {
        semana: i + 1,
        etapa: str(o.etapa, "Etapa"),
        foco: str(o.foco),
        baseLogicaConceitual: str(o.baseLogicaConceitual),
        tecnologiasFerramentas: str(o.tecnologiasFerramentas),
        praticaSugerida: str(o.praticaSugerida),
        entregavel: str(o.entregavel),
        horas: Math.max(0, Math.round(num(o.horas, hpw))),
        requisitoRelacionado: str(o.requisitoRelacionado),
      }
    })
    .filter((w) => w.foco || w.baseLogicaConceitual)
    .map((w, i) => ({ ...w, semana: i + 1 }))

  let etapasResumo: EtapaResumo[] = arr(r.etapasResumo)
    .map((e): EtapaResumo => {
      const o = obj(e)
      return { etapa: str(o.etapa), horas: Math.max(0, Math.round(num(o.horas))) }
    })
    .filter((e) => e.etapa)
  if (etapasResumo.length === 0 && planoSemanal.length > 0) {
    const map = new Map<string, number>()
    for (const w of planoSemanal) {
      map.set(w.etapa, (map.get(w.etapa) ?? 0) + w.horas)
    }
    etapasResumo = [...map.entries()].map(([etapa, horas]) => ({ etapa, horas }))
  }

  const requisitos: StudyPlanRequisito[] = arr(r.requisitos)
    .map((q): StudyPlanRequisito => {
      const o = obj(q)
      return {
        tipo: oneOf<RequisitoTipo>(o.tipo, REQUISITO_TIPOS, "Obrigatório"),
        competencia: str(o.competencia || o.nome),
        ondeEstudar: str(o.ondeEstudar),
        evidenciaPortfolio: str(o.evidenciaPortfolio || o.comprovacao),
      }
    })
    .filter((q) => q.competencia)

  const principiosList = arr(r.principiosDeExecucao)
    .map((p) => str(p))
    .filter(Boolean)
  const principiosDeExecucao =
    principiosList.length > 0 ? principiosList : DEFAULT_PRINCIPIOS

  const pfRaw = obj(r.projetoFinal)
  const tarefas: ProjetoTarefa[] = arr(pfRaw.tarefas)
    .map((t): ProjetoTarefa => {
      const o = obj(t)
      return {
        area: str(o.area, "Geral"),
        tarefa: str(o.tarefa),
        prioridade: oneOf<Prioridade>(o.prioridade, PRIORIDADES, "Média"),
        competencia: str(o.competencia),
      }
    })
    .filter((t) => t.tarefa)
  const projetoFinal: ProjetoFinal = {
    descricao: str(pfRaw.descricao),
    tarefas,
  }

  let rotinaSemanal: RotinaDia[] = arr(r.rotinaSemanal)
    .map((d): RotinaDia => {
      const o = obj(d)
      return {
        dia: str(o.dia),
        bloco: str(o.bloco),
        horas: Math.max(0, num(o.horas)),
        atividade: str(o.atividade),
      }
    })
    .filter((d) => d.dia || d.atividade)
  if (rotinaSemanal.length === 0) {
    const perDay = Math.max(0.5, Math.round((hpw / 6) * 10) / 10)
    rotinaSemanal = DIAS.slice(0, 6).map((dia) => ({
      dia,
      bloco: "Estudo e prática",
      horas: perDay,
      atividade:
        "Estudar o conteúdo da semana, praticar exercícios e evoluir o projeto.",
    }))
    rotinaSemanal.push({
      dia: "Domingo",
      bloco: "Revisão",
      horas: 1,
      atividade: "Revisar erros, atualizar o progresso e planejar a próxima semana.",
    })
  }

  const semanas = planoSemanal.length
  const cargaTotalHoras = planoSemanal.reduce((sum, w) => sum + w.horas, 0)

  return {
    vaga,
    indicadores: { semanas, cargaTotalHoras },
    principiosDeExecucao,
    etapasResumo,
    requisitos,
    planoSemanal,
    projetoFinal,
    rotinaSemanal,
  }
}
