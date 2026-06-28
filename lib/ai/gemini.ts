import { GoogleGenAI } from "@google/genai"
import {
  composeResumePrompt,
  ANALYSIS_PROMPT,
  REQUIREMENTS_EVALUATION_PROMPT,
} from "@/lib/resume-ai-prompt"
import { composeLinkedinPrompt } from "@/lib/linkedin-ai-prompt"
import { composeStudyPlanPrompt } from "@/lib/study-plan-ai-prompt"

const DEFAULT_MODEL = "gemini-2.5-flash"

export class ResumeAIError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.name = "ResumeAIError"
    this.status = status
  }
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new ResumeAIError(
      "A ferramenta de IA ainda não foi configurada. O administrador precisa definir a GEMINI_API_KEY.",
      503,
    )
  }
  return { ai: new GoogleGenAI({ apiKey }), model: process.env.GEMINI_MODEL || DEFAULT_MODEL }
}

export interface TrajectoryTopic {
  year: string
  text: string
}

export type RequirementKind = "essential" | "differential"
export type RequirementEvidence = "strong" | "weak" | "missing"

export interface RequirementItem {
  skill: string
  kind: RequirementKind
  evidence: RequirementEvidence
}

export interface GapQuestion {
  skill: string
  question: string
}

export interface EvidenceAnswer {
  skill: string
  answer: string
  results?: string
}

interface ImproveResumeInput {
  pdfBase64: string
  jobDescription: string
  customPrompt?: string | null
  requirements?: RequirementItem[]
  evidenceAnswers?: EvidenceAnswer[]
  trajectory?: TrajectoryTopic[]
}

export interface ResumeAnalysis {
  hasExperience: boolean
  requirements: RequirementItem[]
  questions: GapQuestion[]
  compatibility: number
}

export interface LinkedInAnalysisInput {
  pdfBase64: string
  careerGoal: string
  profileLanguage: string
  recommendations: string
  publishingFrequency: string
  connections: string
  mainSkills: string
  customPrompt?: string | null
}

export async function analyzeResume({
  pdfBase64,
  jobDescription,
}: {
  pdfBase64: string
  jobDescription: string
  customPrompt?: string | null
}): Promise<ResumeAnalysis> {
  const { ai, model } = getClient()

  const userText = `Descrição da vaga:\n\n${jobDescription}\n\nAnalise o currículo anexado e retorne o JSON conforme as regras.`

  const config: Record<string, unknown> = {
    systemInstruction: ANALYSIS_PROMPT,
    temperature: 0.3,
    responseMimeType: "application/json",
  }
  if (model.includes("flash")) {
    config.thinkingConfig = { thinkingBudget: 0 }
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            { text: userText },
          ],
        },
      ],
      config,
    })

    const text = (response.text || "").trim()
    if (!text) {
      throw new ResumeAIError("A IA não retornou nenhum conteúdo. Tente novamente.")
    }

    const parsed = JSON.parse(text) as {
      hasExperience?: boolean
      requirements?: RequirementItem[]
      questions?: GapQuestion[]
    }
    const requirements = normalizeRequirements(parsed.requirements)
    if (requirements.length === 0) {
      throw new ResumeAIError("Formato de resposta inválido da IA.")
    }
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions
          .filter((q) => q && typeof q.skill === "string" && typeof q.question === "string")
          .slice(0, 6)
      : []

    return {
      hasExperience: Boolean(parsed.hasExperience),
      requirements,
      questions,
      compatibility: scoreFromRequirements(requirements),
    }
  } catch (error) {
    if (error instanceof ResumeAIError) throw error
    if (error instanceof SyntaxError) {
      throw new ResumeAIError("A IA retornou um formato inválido. Tente novamente.")
    }
    const message = error instanceof Error ? error.message : "Erro desconhecido"
    throw new ResumeAIError(`Falha na análise do currículo: ${message}`)
  }
}

export async function improveResume({
  pdfBase64,
  jobDescription,
  customPrompt,
  requirements,
  evidenceAnswers,
  trajectory,
}: ImproveResumeInput): Promise<{ resume: string; suggestions: string[] }> {
  const { ai, model } = getClient()

  const systemInstruction = composeResumePrompt(customPrompt)

  let userText = `Descrição da vaga para a qual o currículo deve ser otimizado:\n\n${jobDescription}\n\n`

  if (requirements && requirements.length > 0) {
    const essentials = requirements.filter((r) => r.kind === "essential")
    const differentials = requirements.filter((r) => r.kind === "differential")
    userText += `Requisitos da vaga (use para direcionar o currículo; conecte cada requisito a evidência concreta quando existir):\n`
    if (essentials.length > 0) {
      userText += `Essenciais (dia a dia): ${essentials.map((r) => r.skill).join(", ")}\n`
    }
    if (differentials.length > 0) {
      userText += `Diferenciais: ${differentials.map((r) => r.skill).join(", ")}\n`
    }
    userText += `\n`
  }

  if (trajectory && trajectory.length > 0) {
    userText += `Trajetória do candidato (ordem cronológica) — use para construir a seção "## Resumo" (sobre), contando como ele chegou até aqui:\n\n`
    for (const topic of trajectory) {
      const year = topic.year?.trim()
      userText += `- ${year ? `(${year}) ` : ""}${topic.text.trim()}\n`
    }
    userText += `\n`
  }

  if (evidenceAnswers && evidenceAnswers.length > 0) {
    userText += `Evidências concretas fornecidas pelo candidato (skill → relato de projeto/atividade real, com os resultados obtidos). Use-as para comprovar os requisitos correspondentes, sem inventar nada além do relatado. SEMPRE que houver resultados, transforme-os em bullets de impacto quantificado — é o que o gestor da vaga avalia:\n\n`
    for (const ev of evidenceAnswers) {
      userText += `**${ev.skill}:**\nProjeto/atividade: ${ev.answer}\n`
      if (ev.results && ev.results.trim()) {
        userText += `Resultados obtidos: ${ev.results.trim()}\n`
      }
      userText += `\n`
    }
  }

  userText += `Gere agora o JSON com "resume" (currículo em Markdown, sem sugestões) e "suggestions", seguindo estritamente as regras.`

  const config: Record<string, unknown> = {
    systemInstruction,
    temperature: 0.4,
    responseMimeType: "application/json",
  }
  if (model.includes("flash")) {
    config.thinkingConfig = { thinkingBudget: 0 }
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            { text: userText },
          ],
        },
      ],
      config,
    })

    const text = (response.text || "").trim()
    if (!text) {
      throw new ResumeAIError("A IA não retornou nenhum conteúdo. Tente novamente.")
    }

    // Tolerante a falhas: se não vier JSON válido, trata todo o texto como currículo.
    try {
      const parsed = JSON.parse(text) as { resume?: string; suggestions?: unknown }
      const resume = (parsed.resume || "").trim()
      if (!resume) throw new Error("empty resume")
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
            .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
            .map((s) => s.trim())
            .slice(0, 8)
        : []
      return { resume, suggestions }
    } catch {
      return { resume: text, suggestions: [] }
    }
  } catch (error) {
    if (error instanceof ResumeAIError) throw error
    const message = error instanceof Error ? error.message : "Erro desconhecido"
    throw new ResumeAIError(`Falha ao gerar o currículo com IA: ${message}`)
  }
}

const REQUIREMENT_WEIGHT: Record<RequirementKind, number> = {
  essential: 3,
  differential: 1,
}
const EVIDENCE_COVERAGE: Record<RequirementEvidence, number> = {
  strong: 1,
  weak: 0.5,
  missing: 0,
}

/**
 * Calcula a compatibilidade (0-100) a partir da cobertura dos requisitos.
 * Determinístico: o número só sobe quando a evidência classificada melhora.
 */
export function scoreFromRequirements(requirements: RequirementItem[]): number {
  let weighted = 0
  let total = 0
  for (const req of requirements) {
    const weight = REQUIREMENT_WEIGHT[req.kind] ?? 1
    total += weight
    weighted += weight * (EVIDENCE_COVERAGE[req.evidence] ?? 0)
  }
  if (total === 0) return 0
  return Math.round((100 * weighted) / total)
}

function normalizeRequirements(value: unknown): RequirementItem[] {
  if (!Array.isArray(value)) return []
  const out: RequirementItem[] = []
  for (const raw of value) {
    if (!raw || typeof raw.skill !== "string" || !raw.skill.trim()) continue
    const kind: RequirementKind = raw.kind === "differential" ? "differential" : "essential"
    const evidence: RequirementEvidence =
      raw.evidence === "strong" || raw.evidence === "weak" ? raw.evidence : "missing"
    out.push({ skill: raw.skill.trim(), kind, evidence })
  }
  return out.slice(0, 12)
}

/**
 * Reclassifica a evidência de cada requisito (lista fixa) sobre um currículo em
 * texto e devolve a pontuação calculada no código. Usado para o "depois".
 */
export async function evaluateRequirements({
  jobDescription,
  resumeText,
  requirements,
}: {
  jobDescription: string
  resumeText: string
  requirements: RequirementItem[]
}): Promise<{ requirements: RequirementItem[]; score: number }> {
  if (requirements.length === 0) return { requirements: [], score: 0 }

  const { ai, model } = getClient()

  const reqList = requirements.map((r) => ({ skill: r.skill, kind: r.kind }))
  const userText = `Vaga:\n\n${jobDescription}\n\nRequisitos a avaliar (preserve skill e kind, defina apenas evidence):\n${JSON.stringify(reqList)}\n\nCurrículo a avaliar:\n\n${resumeText}\n\nRetorne o JSON com a evidência de cada requisito.`

  const config: Record<string, unknown> = {
    systemInstruction: REQUIREMENTS_EVALUATION_PROMPT,
    temperature: 0.2,
    responseMimeType: "application/json",
  }
  if (model.includes("flash")) {
    config.thinkingConfig = { thinkingBudget: 0 }
  }

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: userText }] }],
    config,
  })

  const text = (response.text || "").trim()
  if (!text) {
    throw new ResumeAIError("A IA não retornou nenhum conteúdo. Tente novamente.")
  }

  const parsed = JSON.parse(text) as { requirements?: unknown }
  const evaluated = normalizeRequirements(parsed.requirements)

  // Garante a mesma lista de requisitos da análise (kind original; evidence reavaliado).
  const evidenceBySkill = new Map(
    evaluated.map((r) => [r.skill.toLowerCase(), r.evidence]),
  )
  const merged = requirements.map((r) => ({
    ...r,
    evidence: evidenceBySkill.get(r.skill.toLowerCase()) ?? r.evidence,
  }))

  return { requirements: merged, score: scoreFromRequirements(merged) }
}

const LANGUAGE_LABELS: Record<string, string> = {
  portugues: "Português",
  ingles: "Inglês",
  espanhol: "Espanhol",
  outro: "Outro idioma",
}

const RECOMMENDATION_LABELS: Record<string, string> = {
  nenhuma: "Nenhuma",
  "1-3": "1 a 3",
  "4-10": "4 a 10",
  "mais-de-10": "Mais de 10",
}

const FREQUENCY_LABELS: Record<string, string> = {
  nunca: "Nunca publica",
  raramente: "Raramente",
  mensalmente: "Mensalmente",
  semanalmente: "Semanalmente",
}

const CONNECTION_LABELS: Record<string, string> = {
  "menos-de-100": "Menos de 100",
  "100-500": "100 a 500",
  "500-1000": "500 a 1.000",
  "mais-de-1000": "Mais de 1.000",
}

export async function analyzeLinkedInProfile({
  pdfBase64,
  careerGoal,
  profileLanguage,
  recommendations,
  publishingFrequency,
  connections,
  mainSkills,
  customPrompt,
}: LinkedInAnalysisInput): Promise<string> {
  const { ai, model } = getClient()

  const systemInstruction = composeLinkedinPrompt(customPrompt)

  const userText = [
    `Informações de posicionamento fornecidas pelo profissional:`,
    ``,
    `**Foco para próxima oportunidade:** ${careerGoal}`,
    `**Idioma atual do perfil:** ${LANGUAGE_LABELS[profileLanguage] || profileLanguage}`,
    `**Recomendações no LinkedIn:** ${RECOMMENDATION_LABELS[recommendations] || recommendations}`,
    `**Frequência de publicações:** ${FREQUENCY_LABELS[publishingFrequency] || publishingFrequency}`,
    `**Número de conexões:** ${CONNECTION_LABELS[connections] || connections}`,
    `**Principais áreas de atuação/skills:** ${mainSkills}`,
    ``,
    `Analise o perfil do LinkedIn (PDF anexado) junto com essas informações e gere a análise completa em Markdown, seguindo estritamente as regras e seções definidas.`,
  ].join("\n")

  const config: Record<string, unknown> = {
    systemInstruction,
    temperature: 0.4,
  }
  if (model.includes("flash")) {
    config.thinkingConfig = { thinkingBudget: 0 }
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            { text: userText },
          ],
        },
      ],
      config,
    })

    const text = (response.text || "").trim()
    if (!text) {
      throw new ResumeAIError("A IA não retornou nenhum conteúdo. Tente novamente.")
    }
    return text
  } catch (error) {
    if (error instanceof ResumeAIError) throw error
    const message = error instanceof Error ? error.message : "Erro desconhecido"
    throw new ResumeAIError(`Falha ao analisar o perfil LinkedIn com IA: ${message}`)
  }
}

export interface StudyPlanJobInput {
  title?: string | null
  company?: string | null
  description?: string | null
}

export interface StudyPlanInput {
  roleType: string
  stack?: string | null
  seniority?: string | null
  languages?: string[]
  frameworks?: string[]
  strengths?: string | null
  weaknesses?: string | null
  experience?: string | null
  minutesPerDay: number
  jobs?: StudyPlanJobInput[]
  customPrompt?: string | null
}

const STACK_LABELS: Record<string, string> = {
  fullstack: "Full Stack",
  backend: "Back-end",
  frontend: "Front-end",
  mobile: "Mobile",
  data: "Dados",
  devops: "DevOps",
  outro: "Outro",
}

const SENIORITY_LABELS: Record<string, string> = {
  internship: "Estágio",
  trainee: "Trainee",
  junior: "Júnior",
  mid: "Pleno",
  senior: "Sênior",
}

export async function generateStudyPlan({
  roleType,
  stack,
  seniority,
  languages,
  frameworks,
  strengths,
  weaknesses,
  experience,
  minutesPerDay,
  jobs,
  customPrompt,
}: StudyPlanInput): Promise<string> {
  const { ai, model } = getClient()

  const systemInstruction = composeStudyPlanPrompt(customPrompt)

  const lines: string[] = [
    "Informações fornecidas pelo mentorado para gerar o plano de estudos:",
    "",
    `**Posição-alvo:** ${roleType}${stack ? ` — ${STACK_LABELS[stack] || stack}` : ""}${seniority ? ` (${SENIORITY_LABELS[seniority] || seniority})` : ""}`,
  ]

  if (languages && languages.length > 0) {
    lines.push(`**Linguagens de interesse:** ${languages.join(", ")}`)
  }
  if (frameworks && frameworks.length > 0) {
    lines.push(`**Frameworks/tecnologias de interesse:** ${frameworks.join(", ")}`)
  }

  lines.push(`**Minutos por dia disponíveis para estudo:** ${minutesPerDay} minutos/dia`)

  if (strengths) lines.push("", `**Pontos fortes nessa vaga:** ${strengths}`)
  if (weaknesses) lines.push(`**Pontos fracos / lacunas:** ${weaknesses}`)
  if (experience) lines.push(`**Atividades e projetos já realizados:** ${experience}`)

  if (jobs && jobs.length > 0) {
    lines.push("", "**Vagas-alvo selecionadas:**")
    jobs.forEach((job, i) => {
      const header = [job.title, job.company].filter(Boolean).join(" — ") || `Vaga ${i + 1}`
      lines.push(`- ${header}`)
      if (job.description) lines.push(`  Descrição: ${job.description}`)
    })
  }

  lines.push(
    "",
    "Gere agora o plano de estudos completo em Markdown, seguindo estritamente as regras e a metodologia de minutos focados.",
  )

  const userText = lines.join("\n")

  const config: Record<string, unknown> = {
    systemInstruction,
    temperature: 0.4,
  }
  if (model.includes("flash")) {
    config.thinkingConfig = { thinkingBudget: 0 }
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: userText }] }],
      config,
    })

    const text = (response.text || "").trim()
    if (!text) {
      throw new ResumeAIError("A IA não retornou nenhum conteúdo. Tente novamente.")
    }
    return text
  } catch (error) {
    if (error instanceof ResumeAIError) throw error
    const message = error instanceof Error ? error.message : "Erro desconhecido"
    throw new ResumeAIError(`Falha ao gerar o plano de estudos com IA: ${message}`)
  }
}
