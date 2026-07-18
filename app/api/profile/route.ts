import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db, profiles } from "@/lib/db"
import { requireAuth } from "@/lib/utils/auth"
import { safeOwnResumeHref } from "@/lib/utils/resume-access"
import { toProfile } from "@/lib/db/mappers"
import { optionalWhatsAppSchema } from "@/lib/whatsapp-schema"

const updateSchema = z.object({
  full_name: z.string().min(2).optional(),
  whatsapp: optionalWhatsAppSchema,
  linkedin_url: z.string().url().optional().or(z.literal("")),
  bio: z.string().max(500).optional(),
})

export async function GET() {
  try {
    const user = await requireAuth()

    const [row] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 404 })
    }

    const profile = toProfile(row)

    return NextResponse.json({
      data: {
        ...profile,
        resume_url: safeOwnResumeHref(profile.resume_url),
      },
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (parsed.data.full_name !== undefined) updateData.fullName = parsed.data.full_name
    if (parsed.data.whatsapp !== undefined) updateData.whatsapp = parsed.data.whatsapp
    if (parsed.data.linkedin_url !== undefined) updateData.linkedinUrl = parsed.data.linkedin_url
    if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio

    const [updated] = await db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.id, user.id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 })
    }

    const profile = toProfile(updated)

    return NextResponse.json({
      data: {
        ...profile,
        resume_url: safeOwnResumeHref(profile.resume_url),
      },
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
