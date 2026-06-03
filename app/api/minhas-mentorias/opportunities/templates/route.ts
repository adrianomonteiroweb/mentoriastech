import { NextResponse } from "next/server"
import { getActiveMessageTemplates } from "@/lib/db/mentee-opportunities"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"

export const dynamic = "force-dynamic"

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

// GET /api/minhas-mentorias/opportunities/templates
export async function GET() {
  try {
    await requireMenteeAccess()

    const rows = await getActiveMessageTemplates()
    const data = rows.map((t) => ({
      id: t.id,
      category: t.category,
      title: t.title,
      body: t.body,
      sort_order: t.sortOrder,
      is_active: t.isActive,
      created_at: toIso(t.createdAt) || "",
    }))

    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
