import { GoogleGenAI } from "@google/genai"
import {
  composeResumePrompt,
  ANALYSIS_PROMPT,
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

interface ImproveResumeInput {
  pdfBase64: string
  jobDescription: string
  customPrompt?: string | null
  projectAnswers?: ProjectAnswer[]
}

export interface ResumeAnalysis {
  experiences: AnalysisItem[]
  formations: AnalysisItem[]
  hasExperience: boolean
}

export interface AnalysisItem {
  title: string
  where: string
  period: string
  relevance: string
  question: string
}

export interface ProjectAnswer {
  title: string
  where: string
  answer: string
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
  customPrompt: _customPrompt,
}: Omit<ImproveResumeInput, "projectAnswers">): Promise<ResumeAnalysis> {
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

    const parsed = JSON.parse(text) as ResumeAnalysis
    if (!parsed.experiences || !parsed.formations) {
      throw new ResumeAIError("Formato de resposta inválido da IA.")
    }
    return parsed
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
  projectAnswers,
}: ImproveResumeInput): Promise<string> {
  const { ai, model } = getClient()

  const systemInstruction = composeResumePrompt(customPrompt)

  let userText = `Descrição da vaga para a qual o currículo deve ser otimizado:\n\n${jobDescription}\n\n`

  if (projectAnswers && projectAnswers.length > 0) {
    userText += `Informações adicionais fornecidas pelo candidato sobre projetos e experiências práticas:\n\n`
    for (const pa of projectAnswers) {
      userText += `**${pa.title} (${pa.where}):**\n${pa.answer}\n\n`
    }
  }

  userText += `Gere agora o currículo otimizado em Markdown, seguindo estritamente as regras.`

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
    throw new ResumeAIError(`Falha ao gerar o currículo com IA: ${message}`)
  }
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
