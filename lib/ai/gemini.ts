import { GoogleGenAI } from "@google/genai"
import {
  composeResumePrompt,
  ANALYSIS_PROMPT,
} from "@/lib/resume-ai-prompt"

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
