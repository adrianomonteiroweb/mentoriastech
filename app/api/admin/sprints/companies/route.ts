import { desc } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, simCompanies } from "@/lib/db"
import { toSimCompanyApi } from "@/lib/db/sim"
import { simCompanySchema } from "@/lib/sim/validation"
import { logAuditEvent } from "@/lib/audit"
import { requireMentorAccess } from "@/lib/utils/auth"

export async function GET() {
  try {
    await requireMentorAccess()

    const rows = await db
      .select()
      .from(simCompanies)
      .orderBy(desc(simCompanies.createdAt))

    return NextResponse.json({ data: rows.map(toSimCompanyApi) })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const mentor = await requireMentorAccess()
    const body = await request.json()

    const parsed = simCompanySchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const [data] = await db
      .insert(simCompanies)
      .values({
        name: parsed.data.name,
        archetype: parsed.data.archetype,
        description: parsed.data.description || null,
        productDescription: parsed.data.product_description || null,
        clientDescription: parsed.data.client_description || null,
        serviceDescription: parsed.data.service_description || null,
        processDescription: parsed.data.process_description || null,
        poDocMarkdown: parsed.data.po_doc_markdown || null,
        pmDocMarkdown: parsed.data.pm_doc_markdown || null,
        techLeadDocMarkdown: parsed.data.tech_lead_doc_markdown || null,
        isActive: parsed.data.is_active ?? true,
        createdBy: mentor.id,
      })
      .returning()

    await logAuditEvent({
      actorId: mentor.id,
      action: "sim_company_created",
      route: "/api/admin/sprints/companies",
      request,
      metadata: { companyId: data.id },
    })

    return NextResponse.json({ data: toSimCompanyApi(data) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
