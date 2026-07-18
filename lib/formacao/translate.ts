import { GoogleGenAI } from "@google/genai"

const DEFAULT_MODEL = "gemini-2.5-flash"

export class TranslationError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.name = "TranslationError"
    this.status = status
  }
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new TranslationError(
      "A tradução com IA ainda não foi configurada (GEMINI_API_KEY ausente).",
      503,
    )
  }
  return { ai: new GoogleGenAI({ apiKey }), model: process.env.GEMINI_MODEL || DEFAULT_MODEL }
}

const SYSTEM_PROMPT = `You are a professional English translator for a Brazilian tech education platform.

Your task: translate a short Portuguese text into natural, professional English suitable for a daily standup meeting in a software development team.

Rules:
- Output ONLY the English translation, nothing else
- Keep it concise and professional (daily standup context)
- Use present simple or present perfect as appropriate
- Do not add explanations, notes, or formatting
- If the input is already in English, return it unchanged
- Maximum 2 sentences`

export async function translateToEnglish(textPt: string): Promise<string> {
  const { ai, model } = getClient()

  const config: Record<string, unknown> = {
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.2,
  }
  if (model.includes("flash")) {
    config.thinkingConfig = { thinkingBudget: 0 }
  }

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: textPt }] }],
    config,
  })

  const text = (response.text || "").trim()
  if (!text) {
    throw new TranslationError("A IA não retornou a tradução. Tente novamente.")
  }
  return text
}

export function buildIncrements(sentence: string): string[] {
  const words = sentence.split(/\s+/).filter(Boolean)
  return words.map((_, i) => words.slice(0, i + 1).join(" "))
}
