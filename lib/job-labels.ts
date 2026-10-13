// -----------------------------------------------------------------------------
// Rotulos de vaga — FONTE UNICA.
//
// Por que este arquivo existe: os mesmos rotulos estavam copiados em 14 arquivos
// e ja tinham divergido de tres jeitos diferentes, de forma visivel para quem
// usa a plataforma:
//
//   internship    "Estagio & Trainee" | "Estágio" | "Estagio"
//   senior_staff  "Senior Staff"      | "Sênior Staff"
//   (o painel de oportunidades perdeu todos os acentos)
//
// Ou seja: a MESMA vaga aparecia com nivel escrito de um jeito no portal e de
// outro no painel. Rotulo duplicado nao fica sincronizado — ele diverge em
// silencio, e so quem usa percebe.
//
// Rotulo de AREA nao mora aqui: ele vem do catalogo de lib/job-areas.ts, que ja
// e fonte unica (getAreaFamilyLabel / getAreaSpecialtyLabel).
// -----------------------------------------------------------------------------

export const JOB_LEVEL_ORDER = [
  "internship",
  "junior",
  "mid",
  "senior",
  "staff",
  "senior_staff",
  "principal",
  "distinguished",
] as const

export type JobLevelKey = (typeof JOB_LEVEL_ORDER)[number]

/**
 * Rotulo completo do nivel. "Estagio & Trainee" porque as duas coisas caem
 * neste valor: separa-las exigiria uma coluna nova e o mercado usa os termos
 * de forma intercambiavel na pratica.
 */
export const JOB_LEVEL_LABELS: Record<string, string> = {
  internship: "Estágio & Trainee",
  junior: "Júnior",
  mid: "Pleno",
  senior: "Sênior",
  staff: "Staff",
  senior_staff: "Sênior Staff",
  principal: "Principal",
  distinguished: "Distinguished",
}

/**
 * Versao curta, para onde o espaco e apertado: chip de filtro no celular, eixo
 * de grafico, coluna de tabela. Existe para o grafico nao precisar inventar a
 * propria abreviacao — foi assim que "Estágio" e "Estagio" surgiram.
 */
export const JOB_LEVEL_SHORT_LABELS: Record<string, string> = {
  ...JOB_LEVEL_LABELS,
  internship: "Estágio",
}

export const JOB_TYPE_LABELS: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Híbrido",
  onsite: "Presencial",
}

export const LANGUAGE_LEVEL_LABELS: Record<string, string> = {
  a1: "A1",
  a2: "A2",
  b1: "B1",
  b2: "B2",
  c1: "C1",
  c2: "C2",
  basic: "Básico",
  intermediate: "Intermediário",
  advanced: "Avançado",
  fluent: "Fluente",
}

export const JOB_SCOPE_LABELS: Record<string, string> = {
  br: "Brasil",
  world: "Internacional",
}

/** Valor desconhecido volta como veio, nunca vazio: melhor cru que invisivel. */
export function getJobLevelLabel(key: string | null | undefined, short = false): string {
  if (!key) return ""
  const table = short ? JOB_LEVEL_SHORT_LABELS : JOB_LEVEL_LABELS
  return table[key] ?? key
}

export function getJobTypeLabel(key: string | null | undefined): string {
  if (!key) return ""
  return JOB_TYPE_LABELS[key] ?? key
}

export function getLanguageLevelLabel(key: string | null | undefined): string {
  if (!key) return ""
  return LANGUAGE_LEVEL_LABELS[key] ?? key.toUpperCase()
}

/** Opcoes de nivel na ordem de carreira, prontas para o filtro. */
export function jobLevelOptions(short = false) {
  return JOB_LEVEL_ORDER.map((key) => ({
    key,
    label: getJobLevelLabel(key, short),
  }))
}

export function jobTypeOptions() {
  return (["remote", "hybrid", "onsite"] as const).map((key) => ({
    key,
    label: JOB_TYPE_LABELS[key],
  }))
}
