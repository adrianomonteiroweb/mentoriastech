import { NextResponse } from "next/server"
import { z } from "zod"
import { extractJobRequirements, ResumeAIError } from "@/lib/ai/gemini"
import {
  enforceToolRateLimit,
  ToolRateLimitError,
} from "@/lib/utils/tool-rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

const dataSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(40, "Descreva a vaga com mais detalhes (mínimo 40 caracteres).")
    .max(8000, "Descrição muito longa (máximo 8000 caracteres)."),
  jobUrl: z.string().url().max(500).optional().or(z.literal("")),
})

export async function POST(request: Request) {
  try {
    await enforceToolRateLimit(request, "study_plan_requirements", 10)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
    }

    const parsed = dataSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const preview = await extractJobRequirements({
      jobDescription: parsed.data.jobDescription,
      jobUrl: parsed.data.jobUrl || undefined,
    })

    return NextResponse.json(preview)
  } catch (error) {
    if (error instanceof ResumeAIError || error instanceof ToolRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
