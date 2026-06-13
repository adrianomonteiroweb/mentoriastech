import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db, profiles } from "@/lib/db"
import { toProfile } from "@/lib/db/mappers"
import { requireMentorAccess } from "@/lib/utils/auth"
import { safeProfileResumeHref } from "@/lib/utils/resume-access"
import { z } from "zod"

const updateSchema = z.object({
  full_name: z.string().optional(),
  email: z.string().email().optional(),
  whatsapp: z.string().optional(),
  linkedin_url: z.string().url().optional().or(z.literal("")),
  bio: z.string().optional(),
  portfolio_url: z.string().url().optional().or(z.literal("")),
  career_status: z
    .enum(["seeking", "interning", "employed", "student", "other"])
    .nullable()
    .optional()
    .or(z.literal("")),
  seniority: z
    .enum(["junior", "mid", "senior", "undefined"])
    .nullable()
    .optional()
    .or(z.literal("")),
  career_focus: z.string().nullable().optional(),
  origin_category: z
    .enum(["linkedin", "palestra", "indicacao", "instagram", "evento"])
    .nullable()
    .optional()
    .or(z.literal("")),
  origin_description: z.string().nullable().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const [mentee] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1)

    if (!mentee || mentee.role !== "mentee") {
      return NextResponse.json({ error: "Mentorado nao encontrado" }, { status: 404 })
    }

    const updateData: Partial<typeof profiles.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (parsed.data.full_name !== undefined) updateData.fullName = parsed.data.full_name || null
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email
    if (parsed.data.whatsapp !== undefined) updateData.whatsapp = parsed.data.whatsapp || null
    if (parsed.data.linkedin_url !== undefined) updateData.linkedinUrl = parsed.data.linkedin_url || null
    if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio || null
    if (parsed.data.portfolio_url !== undefined) updateData.portfolioUrl = parsed.data.portfolio_url || null
    if (parsed.data.career_status !== undefined) updateData.careerStatus = parsed.data.career_status || null
    if (parsed.data.seniority !== undefined) updateData.seniority = parsed.data.seniority || null
    if (parsed.data.career_focus !== undefined) updateData.careerFocus = parsed.data.career_focus || null
    if (parsed.data.origin_category !== undefined) updateData.originCategory = parsed.data.origin_category || null
    if (parsed.data.origin_description !== undefined) updateData.originDescription = parsed.data.origin_description || null

    const [data] = await db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.id, id))
      .returning()

    const profile = toProfile(data)
    return NextResponse.json({
      data: {
        ...profile,
        resume_url: safeProfileResumeHref(profile.id, profile.resume_url),
      },
    })
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
    await requireMentorAccess()
    const { id } = await params

    const [mentee] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1)

    if (!mentee || mentee.role !== "mentee") {
      return NextResponse.json({ error: "Mentorado nao encontrado" }, { status: 404 })
    }

    await db.delete(profiles).where(eq(profiles.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
