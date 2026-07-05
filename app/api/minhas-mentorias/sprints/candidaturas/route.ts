import { and, desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import {
  db,
  simApplications,
  simCompanies,
  simSprintTemplates,
} from "@/lib/db"
import {
  getActiveSprintForProfile,
  hasPendingApplication,
  toSimApplicationApi,
} from "@/lib/db/sim"
import { simApplySchema } from "@/lib/sim/validation"
import { logAuditEvent } from "@/lib/audit"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)

    const rows = await db
      .select({
        application: simApplications,
        template: simSprintTemplates,
        companyName: simCompanies.name,
        companyArchetype: simCompanies.archetype,
      })
      .from(simApplications)
      .innerJoin(
        simSprintTemplates,
        eq(simApplications.templateId, simSprintTemplates.id),
      )
      .innerJoin(simCompanies, eq(simSprintTemplates.companyId, simCompanies.id))
      .where(eq(simApplications.profileId, profile.id))
      .orderBy(desc(simApplications.createdAt))

    return NextResponse.json({
      data: rows.map((row) =>
        toSimApplicationApi(row.application, {
          template: {
            id: row.template.id,
            title: row.template.title,
            level: row.template.level,
            duration_days: row.template.durationDays,
          },
          company: {
            id: row.template.companyId,
            name: row.companyName,
            archetype: row.companyArchetype,
          },
        }),
      ),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)
    const body = await request.json()

    const parsed = simApplySchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const activeSprint = await getActiveSprintForProfile(profile.id)
    if (activeSprint) {
      return NextResponse.json(
        { error: "Voce ja tem uma sprint em andamento. Conclua-a antes de se candidatar a outra vaga." },
        { status: 409 },
      )
    }

    if (await hasPendingApplication(profile.id)) {
      return NextResponse.json(
        { error: "Voce ja tem uma candidatura aguardando aprovacao do mentor." },
        { status: 409 },
      )
    }

    const [template] = await db
      .select({
        id: simSprintTemplates.id,
        isActive: simSprintTemplates.isActive,
        companyActive: simCompanies.isActive,
      })
      .from(simSprintTemplates)
      .innerJoin(simCompanies, eq(simSprintTemplates.companyId, simCompanies.id))
      .where(eq(simSprintTemplates.id, parsed.data.template_id))
      .limit(1)

    if (!template || !template.isActive || !template.companyActive) {
      return NextResponse.json(
        { error: "Vaga nao encontrada ou encerrada" },
        { status: 404 },
      )
    }

    const [data] = await db
      .insert(simApplications)
      .values({
        profileId: profile.id,
        templateId: parsed.data.template_id,
        message: parsed.data.message || null,
        status: "pending",
      })
      .returning()

    await logAuditEvent({
      actorId: profile.id,
      action: "sim_application_created",
      route: "/api/minhas-mentorias/sprints/candidaturas",
      request,
      metadata: { templateId: parsed.data.template_id },
    })

    return NextResponse.json(
      { data: toSimApplicationApi(data) },
      { status: 201 },
    )
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
