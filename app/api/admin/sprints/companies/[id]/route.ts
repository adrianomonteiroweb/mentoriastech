import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simCompanies, simSprints } from "@/lib/db"
import { toSimCompanyApi } from "@/lib/db/sim"
import { simCompanySchema } from "@/lib/sim/validation"
import { logAuditEvent } from "@/lib/audit"
import { requireMentorAccess, requireRole } from "@/lib/utils/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMentorAccess()
    const { id } = await params

    const [company] = await db
      .select()
      .from(simCompanies)
      .where(eq(simCompanies.id, id))
      .limit(1)

    if (!company) {
      return NextResponse.json(
        { error: "Empresa nao encontrada" },
        { status: 404 },
      )
    }

    return NextResponse.json({ data: toSimCompanyApi(company) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const mentor = await requireMentorAccess()
    const { id } = await params
    const body = await request.json()

    const parsed = simCompanySchema.partial().safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const updateData: Partial<typeof simCompanies.$inferInsert> = {
      updatedAt: new Date(),
    }
    const d = parsed.data
    if (d.name !== undefined) updateData.name = d.name
    if (d.archetype !== undefined) updateData.archetype = d.archetype
    if (d.description !== undefined) updateData.description = d.description || null
    if (d.product_description !== undefined)
      updateData.productDescription = d.product_description || null
    if (d.client_description !== undefined)
      updateData.clientDescription = d.client_description || null
    if (d.service_description !== undefined)
      updateData.serviceDescription = d.service_description || null
    if (d.process_description !== undefined)
      updateData.processDescription = d.process_description || null
    if (d.po_doc_markdown !== undefined)
      updateData.poDocMarkdown = d.po_doc_markdown || null
    if (d.pm_doc_markdown !== undefined)
      updateData.pmDocMarkdown = d.pm_doc_markdown || null
    if (d.tech_lead_doc_markdown !== undefined)
      updateData.techLeadDocMarkdown = d.tech_lead_doc_markdown || null
    if (d.is_active !== undefined) updateData.isActive = d.is_active

    const [data] = await db
      .update(simCompanies)
      .set(updateData)
      .where(eq(simCompanies.id, id))
      .returning()

    if (!data) {
      return NextResponse.json(
        { error: "Empresa nao encontrada" },
        { status: 404 },
      )
    }

    await logAuditEvent({
      actorId: mentor.id,
      action: "sim_company_updated",
      route: `/api/admin/sprints/companies/${id}`,
      request,
    })

    return NextResponse.json({ data: toSimCompanyApi(data) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireRole("admin")
    const { id } = await params

    const [linkedSprint] = await db
      .select({ id: simSprints.id })
      .from(simSprints)
      .where(eq(simSprints.companyId, id))
      .limit(1)

    if (linkedSprint) {
      return NextResponse.json(
        {
          error:
            "Empresa possui sprints vinculadas. Desative-a em vez de excluir.",
        },
        { status: 409 },
      )
    }

    await db.delete(simCompanies).where(eq(simCompanies.id, id))

    await logAuditEvent({
      actorId: admin.id,
      action: "sim_company_deleted",
      route: `/api/admin/sprints/companies/${id}`,
      request,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
