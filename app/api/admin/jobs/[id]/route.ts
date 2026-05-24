import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { requireRole } from "@/lib/utils/auth"
import { db, jobs } from "@/lib/db"
import { toJob } from "@/lib/db/mappers"
import { z } from "zod"

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  company: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  location: z.string().optional(),
  job_type: z.enum(["remote", "hybrid", "onsite"]).optional(),
  level: z.enum(["internship", "junior", "mid", "senior"]).optional(),
  salary_range: z.string().optional(),
  application_url: z.string().url().optional().or(z.literal("")),
  is_international: z.boolean().optional(),
  required_language: z.string().optional(),
  language_level: z.enum(["basic", "intermediate", "advanced", "fluent"]).optional(),
  status: z.enum(["pending", "approved", "rejected", "expired"]).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireRole("admin")
    const { id } = await params
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const updateData: Partial<typeof jobs.$inferInsert> = { updatedAt: new Date() }

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title
    if (parsed.data.company !== undefined) updateData.company = parsed.data.company
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description
    if (parsed.data.location !== undefined) updateData.location = parsed.data.location || null
    if (parsed.data.job_type !== undefined) updateData.jobType = parsed.data.job_type
    if (parsed.data.level !== undefined) updateData.level = parsed.data.level
    if (parsed.data.salary_range !== undefined) updateData.salaryRange = parsed.data.salary_range || null
    if (parsed.data.application_url !== undefined) updateData.applicationUrl = parsed.data.application_url || null
    if (parsed.data.is_international !== undefined) updateData.isInternational = parsed.data.is_international
    if (parsed.data.required_language !== undefined) updateData.requiredLanguage = parsed.data.required_language || null
    if (parsed.data.language_level !== undefined) updateData.languageLevel = parsed.data.language_level || null
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status

    if (parsed.data.status === "approved") {
      updateData.approvedBy = admin.id
      updateData.approvedAt = new Date()
    } else if (parsed.data.status !== undefined) {
      updateData.approvedBy = null
      updateData.approvedAt = null
    }

    const [data] = await db
      .update(jobs)
      .set(updateData)
      .where(eq(jobs.id, id))
      .returning()

    if (!data) {
      return NextResponse.json({ error: "Vaga nao encontrada" }, { status: 404 })
    }

    return NextResponse.json({ data: toJob(data) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin")
    const { id } = await params

    await db.delete(jobs).where(eq(jobs.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
