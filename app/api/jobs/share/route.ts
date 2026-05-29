import { NextResponse } from "next/server"
import { z } from "zod"
import { db, jobs } from "@/lib/db"
import { toJob } from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"

// Indicação enxuta da comunidade: apenas link + por que achou interessante (+ título).
const shareSchema = z.object({
  title: z.string().min(3),
  application_url: z.string().url(),
  recommendation_note: z.string().min(10),
  company: z.string().optional(),
})

// POST: indicar vaga (qualquer usuario autenticado). Sempre pendente — admin aprova.
export async function POST(request: Request) {
  try {
    const profile = await requireRole("admin", "hr", "mentee")
    const body = await request.json()

    const parsed = shareSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const [data] = await db
      .insert(jobs)
      .values({
        title: parsed.data.title,
        company: parsed.data.company || null,
        description: null,
        recommendationNote: parsed.data.recommendation_note,
        applicationUrl: parsed.data.application_url,
        postedBy: profile.id,
        status: "pending",
        approvedBy: null,
        approvedAt: null,
      })
      .returning()

    return NextResponse.json({ data: toJob(data) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
