import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db, contentSuggestions, profiles } from "@/lib/db"
import { toContentSuggestion, toProfile } from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"

const VALID_STATUS = ["pending", "reviewed", "approved", "archived"] as const

// GET: lista solicitacoes/indicacoes (admin). Filtro opcional ?status=
export async function GET(request: Request) {
  try {
    await requireRole("admin")
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get("status")
    const validStatus = VALID_STATUS.includes(statusParam as (typeof VALID_STATUS)[number])
      ? (statusParam as (typeof VALID_STATUS)[number])
      : null

    const rows = await db
      .select({ suggestion: contentSuggestions, profile: profiles })
      .from(contentSuggestions)
      .leftJoin(profiles, eq(contentSuggestions.userId, profiles.id))
      .where(validStatus ? eq(contentSuggestions.status, validStatus) : undefined)
      .orderBy(desc(contentSuggestions.createdAt))

    return NextResponse.json({
      data: rows.map((row) => ({
        ...toContentSuggestion(row.suggestion),
        profiles: row.profile ? toProfile(row.profile) : null,
      })),
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
