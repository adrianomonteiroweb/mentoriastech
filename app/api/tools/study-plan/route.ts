import { NextResponse } from "next/server"
import { z } from "zod"
import { generateJobStudyPlan, ResumeAIError } from "@/lib/ai/gemini"
import { buildStudyPlanWorkbook } from "@/lib/study-plan-xlsx/workbook"
import {
  enforceToolRateLimit,
  ToolRateLimitError,
} from "@/lib/utils/tool-rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const dataSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(40, "Descreva a vaga com mais detalhes (mínimo 40 caracteres).")
    .max(8000, "Descrição muito longa (máximo 8000 caracteres)."),
  hoursPerWeek: z.number().int().min(5).max(40).optional(),
  candidateName: z.string().trim().max(120).optional().or(z.literal("")),
  level: z
    .enum(["internship", "junior", "mid", "senior"])
    .optional()
    .or(z.literal("")),
  jobUrl: z.string().url().max(500).optional().or(z.literal("")),
})

export async function POST(request: Request) {
  try {
    await enforceToolRateLimit(request, "study_plan_generate", 5)

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

    const plan = await generateJobStudyPlan({
      jobDescription: parsed.data.jobDescription,
      hoursPerWeek: parsed.data.hoursPerWeek,
      candidateName: parsed.data.candidateName || undefined,
      level: parsed.data.level || undefined,
      jobUrl: parsed.data.jobUrl || undefined,
    })

    const buffer = await buildStudyPlanWorkbook(plan)

    return NextResponse.json({ plan, xlsxBase64: buffer.toString("base64") })
  } catch (error) {
    if (error instanceof ResumeAIError || error instanceof ToolRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
