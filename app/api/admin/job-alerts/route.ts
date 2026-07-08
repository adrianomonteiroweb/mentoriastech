import { NextResponse } from "next/server"
import { asc, desc, eq } from "drizzle-orm"
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

// O admin escolhe o mentorado (profile_id) e o WhatsApp é obrigatório; o resto
// tem os mesmos defaults do fluxo do mentorado (defaultJobAlert).
const createSchema = z.object({
  profile_id: z.string().uuid("Selecione um mentorado válido."),
  enabled: z.boolean().default(true),
  name: z.string().trim().max(120).optional().or(z.literal("")),
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

// POST /api/admin/job-alerts — admin inscreve um mentorado no alerta de vagas.
export async function POST(request: Request) {
  try {
    const admin = await requireRole("admin")
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }
    const data = parsed.data

    const [existingProfile] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, data.profile_id))
      .limit(1)

    if (!existingProfile) {
      return NextResponse.json({ error: "Mentorado não encontrado" }, { status: 404 })
    }

    const [existingSub] = await db
      .select({ id: jobAlertSubscriptions.id })
      .from(jobAlertSubscriptions)
      .where(eq(jobAlertSubscriptions.profileId, data.profile_id))
      .limit(1)

    if (existingSub) {
      return NextResponse.json(
        { error: "Este mentorado já possui uma inscrição." },
        { status: 409 },
      )
    }

    const [inserted] = await db
      .insert(jobAlertSubscriptions)
      .values({
        profileId: data.profile_id,
        enabled: data.enabled,
        name: data.name?.trim() || null,
        whatsapp: data.whatsapp,
        positions: normalizeKeywords(data.positions),
        stack: normalizeKeywords(data.stack),
        levels: dedupeList(data.levels),
        ignoreWords: normalizeKeywords(data.ignore_words),
        isInternational: data.is_international,
        dailyLimit: data.daily_limit,
      })
      .returning({ id: jobAlertSubscriptions.id })

    const row = await db
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
      .where(eq(jobAlertSubscriptions.id, inserted.id))
      .then((rows) => rows[0])

    if (!row) {
      return NextResponse.json({ error: "Erro ao carregar inscrição criada" }, { status: 500 })
    }

    await logAuditEvent({
      actorId: admin.id,
      targetUserId: data.profile_id,
      action: "admin_job_alert_created",
      route: new URL(request.url).pathname,
      request,
      metadata: { enabled: data.enabled, dailyLimit: data.daily_limit },
    })

    return NextResponse.json({ data: mapJobAlertAdmin(row as AdminJobAlertRow) }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[admin/job-alerts] POST error:", error)
    return NextResponse.json(
      { error: "Erro ao criar inscrição" },
      { status: 500 },
    )
  }
}

// GET /api/admin/job-alerts — lista todas as inscrições de vagas por WhatsApp,
// enriquecidas com o mentorado (email/nome). Ativas primeiro, depois por nome.
export async function GET() {
  try {
    await requireRole("admin")

    const rows = await db
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
      .orderBy(desc(jobAlertSubscriptions.enabled), asc(profiles.fullName))

    return NextResponse.json({ data: rows.map(mapJobAlertAdmin) })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[admin/job-alerts] GET error:", error)
    return NextResponse.json(
      { error: "Erro ao carregar inscrições" },
      { status: 500 },
    )
  }
}
