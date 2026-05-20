import { NextResponse } from "next/server"
import { and, count, desc, eq, ilike, or } from "drizzle-orm"
import { db, profiles } from "@/lib/db"
import { toProfile } from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"

export async function GET(request: Request) {
  try {
    await requireRole("admin", "hr")
    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search")?.trim()
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")

    const filters = [eq(profiles.role, "mentee")]
    if (search) {
      filters.push(
        or(
          ilike(profiles.fullName, `%${search}%`),
          ilike(profiles.email, `%${search}%`),
        )!,
      )
    }

    const where = and(...filters)
    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(profiles)
        .where(where)
        .orderBy(desc(profiles.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ value: count() }).from(profiles).where(where),
    ])

    return NextResponse.json({
      data: rows.map(toProfile),
      total: totalRows[0]?.value || 0,
      page,
      pageSize,
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
