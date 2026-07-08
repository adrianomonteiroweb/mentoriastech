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

const whatsappField = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((digits) => digits.length >= 10 && digits.length <= 13, {
    message: "Informe um WhatsApp válido (DDD + número).",
  })

const alertFields = {
  enabled: z.boolean().default(true),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  whatsapp: whatsappField,
  positions: keywordArray.default([]),
  stack: keywordArray.default([]),
  levels: z.array(z.enum(["internship", "junior", "mid", "senior"])).max(4).default([]),
  ignore_words: keywordArray.default([]),
  is_international: z.boolean().default(true),
  daily_limit: z.number().int().min(1).max(50).default(10),
}

// Mentorado existente: admin escolhe por profile_id.
const createExistingSchema = z.object({
  profile_id: z.string().uuid("Selecione um mentorado válido."),
  ...alertFields,
})

// Mentorado novo: admin cadastra nome, email e whatsapp inline.
const createNewMenteeSchema = z.object({
  new_mentee: z.object({
    name: z.string().trim().min(1, "Informe o nome.").max(120),
    email: z.string().trim().email("Informe um email válido.").max(200),
    whatsapp: whatsappField,
  }),
  ...alertFields,
})

const createSchema = z.union([createExistingSchema, createNewMenteeSchema])

// POST /api/admin/job-alerts — admin inscreve um mentorado no alerta de vagas.
// Aceita profile_id (mentorado existente) ou new_mentee (cria perfil + inscrição).
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

    let profileId: string

    if ("profile_id" in data) {
      const [existingProfile] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.id, data.profile_id))
        .limit(1)

      if (!existingProfile) {
        return NextResponse.json({ error: "Mentorado não encontrado" }, { status: 404 })
      }
      profileId = data.profile_id
    } else {
      const nm = data.new_mentee
      const [existing] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.email, nm.email.toLowerCase()))
        .limit(1)

      if (existing) {
        profileId = existing.id
      } else {
        const [created] = await db
          .insert(profiles)
          .values({
            email: nm.email.toLowerCase(),
            fullName: nm.name,
            whatsapp: nm.whatsapp,
            role: "mentee",
          })
          .returning({ id: profiles.id })
        profileId = created.id
      }
    }

    const [existingSub] = await db
      .select({ id: jobAlertSubscriptions.id })
      .from(jobAlertSubscriptions)
      .where(eq(jobAlertSubscriptions.profileId, profileId))
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
        profileId,
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
      targetUserId: profileId,
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
