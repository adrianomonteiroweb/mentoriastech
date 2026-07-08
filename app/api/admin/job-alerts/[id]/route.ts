import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db, jobAlertSubscriptions, profiles } from "@/lib/db"
import { AuthError, requireRole } from "@/lib/utils/auth"
import { logAuditEvent } from "@/lib/audit"
import {
  dedupeList,
  mapJobAlertAdmin,
  normalizeKeywords,
  type AdminJobAlertRow,
} from "@/lib/db/job-alerts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const keywordArray = z.array(z.string().trim().min(1).max(60)).max(30)

// Todos os campos opcionais: o admin pode salvar só o toggle (enabled) ou o
// formulário completo. WhatsApp aceita máscara e normaliza p/ dígitos.
const updateSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().trim().max(120).nullable().optional(),
  whatsapp: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((digits) => digits.length >= 10 && digits.length <= 13, {
      message: "Informe um WhatsApp válido (DDD + número).",
    })
    .optional(),
  positions: keywordArray.optional(),
  stack: keywordArray.optional(),
  levels: z.array(z.enum(["internship", "junior", "mid", "senior"])).max(4).optional(),
  ignore_words: keywordArray.optional(),
  is_international: z.boolean().optional(),
  daily_limit: z.number().int().min(1).max(50).optional(),
})

/** Recarrega a linha com JOIN em profiles p/ devolver a forma do painel. */
async function loadAdminRow(id: string): Promise<AdminJobAlertRow | undefined> {
  const [row] = await db
    .select({
      id: jobAlertSubscriptions.id,
      profileId: jobAlertSubscriptions.profileId,
      enabled: jobAlertSubscriptions.enabled,
      name: jobAlertSubscriptions.name,
      whatsapp: jobAlertSubscriptions.whatsapp,
      positions: jobAlertSubscriptions.positions,
      stack: jobAlertSubscriptions.stack,
      levels: jobAlertSubscriptions.levels,
      ignoreWords: jobAlertSubscriptions.ignoreWords,
      isInternational: jobAlertSubscriptions.isInternational,
      dailyLimit: jobAlertSubscriptions.dailyLimit,
      createdAt: jobAlertSubscriptions.createdAt,
      updatedAt: jobAlertSubscriptions.updatedAt,
      email: profiles.email,
      fullName: profiles.fullName,
    })
    .from(jobAlertSubscriptions)
    .innerJoin(profiles, eq(jobAlertSubscriptions.profileId, profiles.id))
    .where(eq(jobAlertSubscriptions.id, id))
    .limit(1)
  return row
}

// PUT /api/admin/job-alerts/[id] — atualiza a inscrição (inclui habilitar/desabilitar)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireRole("admin")
    const { id } = await params

    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }
    const data = parsed.data

    const [existing] = await db
      .select({ id: jobAlertSubscriptions.id })
      .from(jobAlertSubscriptions)
      .where(eq(jobAlertSubscriptions.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Inscrição não encontrada" }, { status: 404 })
    }

    const updateData: Partial<typeof jobAlertSubscriptions.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (data.enabled !== undefined) updateData.enabled = data.enabled
    if (data.name !== undefined) updateData.name = data.name?.trim() || null
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp
    if (data.positions !== undefined) updateData.positions = normalizeKeywords(data.positions)
    if (data.stack !== undefined) updateData.stack = normalizeKeywords(data.stack)
    if (data.levels !== undefined) updateData.levels = dedupeList(data.levels)
    if (data.ignore_words !== undefined)
      updateData.ignoreWords = normalizeKeywords(data.ignore_words)
    if (data.is_international !== undefined) updateData.isInternational = data.is_international
    if (data.daily_limit !== undefined) updateData.dailyLimit = data.daily_limit

    await db
      .update(jobAlertSubscriptions)
      .set(updateData)
      .where(eq(jobAlertSubscriptions.id, id))

    const row = await loadAdminRow(id)
    if (!row) {
      return NextResponse.json({ error: "Inscrição não encontrada" }, { status: 404 })
    }

    await logAuditEvent({
      actorId: admin.id,
      targetUserId: row.profileId,
      action: "admin_job_alert_updated",
      route: new URL(request.url).pathname,
      request,
      metadata: { enabled: row.enabled, dailyLimit: row.dailyLimit },
    })

    return NextResponse.json({ data: mapJobAlertAdmin(row) })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[admin/job-alerts] PUT error:", error)
    return NextResponse.json({ error: "Erro ao atualizar inscrição" }, { status: 500 })
  }
}

// DELETE /api/admin/job-alerts/[id] — remove a inscrição do mentorado
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireRole("admin")
    const { id } = await params

    const [existing] = await db
      .select({ profileId: jobAlertSubscriptions.profileId })
      .from(jobAlertSubscriptions)
      .where(eq(jobAlertSubscriptions.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ error: "Inscrição não encontrada" }, { status: 404 })
    }

    await db.delete(jobAlertSubscriptions).where(eq(jobAlertSubscriptions.id, id))

    await logAuditEvent({
      actorId: admin.id,
      targetUserId: existing.profileId,
      action: "admin_job_alert_deleted",
      route: new URL(request.url).pathname,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[admin/job-alerts] DELETE error:", error)
    return NextResponse.json({ error: "Erro ao remover inscrição" }, { status: 500 })
  }
}
