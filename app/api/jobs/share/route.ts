import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db, jobs } from "@/lib/db"
import { toJob } from "@/lib/db/mappers"
import { getJobSourcePostedAt } from "@/lib/job-active-time"
import { jobActiveHoursSchema } from "@/lib/job-validation"
import { requireRole } from "@/lib/utils/auth"

// Indicação enxuta da comunidade: apenas link + por que achou interessante (+ título).
const shareSchema = z.object({
  title: z.string().min(3),
  application_url: z.string().url(),
  recommendation_note: z.string().min(10),
  company: z.string().optional(),
  active_hours: jobActiveHoursSchema.default(0),
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

    const existing = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.applicationUrl, parsed.data.application_url))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Esta vaga já foi cadastrada com este link." },
        { status: 409 },
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
        sourcePostedAt: getJobSourcePostedAt(parsed.data.active_hours),
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
