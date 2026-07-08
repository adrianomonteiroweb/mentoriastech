import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, jobAlertSubscriptions, profiles } from "@/lib/db"
import { logAuditEvent } from "@/lib/audit"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"
import { defaultJobAlert, mapJobAlert } from "@/lib/db/job-alerts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const keywordArray = z.array(z.string().trim().min(1).max(60)).max(30)

const upsertSchema = z.object({
  enabled: z.boolean().default(true),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  // Dígitos DDD+número (o bot prefixa o DDI 55). Aceita máscara e normaliza p/ dígitos.
  whatsapp: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((digits) => digits.length >= 10 && digits.length <= 13, {
      message: "Informe um WhatsApp válido (DDD + número).",
    }),
  positions: keywordArray.default([]),
  stack: keywordArray.default([]),
  levels: z.array(z.enum(["internship", "junior", "mid", "senior"])).max(4).default([]),
  ignore_words: keywordArray.default([]),
  is_international: z.boolean().default(true),
  daily_limit: z.number().int().min(1).max(50).default(10),
})

/** Normaliza palavras-chave (trim + minúsculas + dedupe), fiel ao splitList do bot. */
function normalizeKeywords(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    const value = raw.trim().toLowerCase()
    if (value && !seen.has(value)) {
      seen.add(value)
      out.push(value)
    }
  }
  return out
}

function dedupe<T>(list: T[]): T[] {
  return Array.from(new Set(list))
}

// GET /api/minhas-mentorias/job-alerts — inscrição atual (ou defaults pré-preenchidos)
export async function GET() {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)

    const [row] = await db
      .select()
      .from(jobAlertSubscriptions)
      .where(eq(jobAlertSubscriptions.profileId, profile.id))
      .limit(1)

    const data = row
      ? mapJobAlert(row)
      : defaultJobAlert({ name: profile.fullName, whatsapp: profile.whatsapp })

    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

// PUT /api/minhas-mentorias/job-alerts — cria ou atualiza a inscrição do mentorado
export async function PUT(request: Request) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)

    const parsed = upsertSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }
    const data = parsed.data

    const name = data.name?.trim() || null
    const values = {
      profileId: profile.id,
      enabled: data.enabled,
      name,
      whatsapp: data.whatsapp,
      positions: normalizeKeywords(data.positions),
      stack: normalizeKeywords(data.stack),
      levels: dedupe(data.levels),
      ignoreWords: normalizeKeywords(data.ignore_words),
      isInternational: data.is_international,
      dailyLimit: data.daily_limit,
    }

    const [row] = await db
      .insert(jobAlertSubscriptions)
      .values(values)
      .onConflictDoUpdate({
        target: jobAlertSubscriptions.profileId,
        set: { ...values, updatedAt: new Date() },
      })
      .returning()

    // Backfill: aproveita para completar o profile se estiver sem esses dados.
    const profilePatch: { whatsapp?: string; fullName?: string } = {}
    if (!profile.whatsapp && data.whatsapp) profilePatch.whatsapp = data.whatsapp
    if (!profile.fullName && name) profilePatch.fullName = name
    if (Object.keys(profilePatch).length > 0) {
      await db.update(profiles).set(profilePatch).where(eq(profiles.id, profile.id))
    }

    await logAuditEvent({
      actorId: profile.id,
      targetUserId: profile.id,
      action: "job_alert_updated",
      route: new URL(request.url).pathname,
      request,
      metadata: { enabled: row.enabled, dailyLimit: row.dailyLimit },
    })

    return NextResponse.json({ data: mapJobAlert(row) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
