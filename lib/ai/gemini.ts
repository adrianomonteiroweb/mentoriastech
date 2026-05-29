import { GoogleGenAI } from "@google/genai"
import { composeResumePrompt } from "@/lib/resume-ai-prompt"

const DEFAULT_MODEL = "gemini-2.5-flash"

export class ResumeAIError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.name = "ResumeAIError"
    this.status = status
  }
}

interface ImproveResumeInput {
  /** PDF do currículo em base64 (sem prefixo data:) */
  pdfBase64: string
  /** Descrição da vaga colada pelo mentorado */
  jobDescription: string
  /** Prompt adicional configurado pelo admin (opcional) */
  customPrompt?: string | null
}

/**
 * Gera uma versão melhorada do currículo (Markdown) a partir do PDF + vaga,
 * usando o Google Gemini. O PDF é enviado nativamente como inlineData.
 */
export async function improveResume({
  pdfBase64,
  jobDescription,
  customPrompt,
}: ImproveResumeInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new ResumeAIError(
      "A ferramenta de IA ainda não foi configurada. O administrador precisa definir a GEMINI_API_KEY.",
      503,
    )
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL
  const ai = new GoogleGenAI({ apiKey })
  const systemInstruction = composeResumePrompt(customPrompt)

  const userText = `Descrição da vaga para a qual o currículo deve ser otimizado:\n\n${jobDescription}\n\nGere agora o currículo otimizado em Markdown, seguindo estritamente as regras.`

  // gemini-2.5-flash permite desativar o "thinking" (mais rápido/barato e evita
  // estourar o orçamento de saída). Outros modelos mantêm o comportamento padrão.
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
