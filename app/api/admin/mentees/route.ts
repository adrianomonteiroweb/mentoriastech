import { NextResponse } from "next/server"
import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm"
import { db, profiles, bookings } from "@/lib/db"
import { toProfile } from "@/lib/db/mappers"
import { requireRole } from "@/lib/utils/auth"
import { ensureMenteeProfile } from "@/lib/db/mentees"
import { z } from "zod"

const createMenteeSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  whatsapp: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    await requireRole("admin")
    const body = await request.json()

    const parsed = createMenteeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const profile = await ensureMenteeProfile({
      email: parsed.data.email,
      fullName: parsed.data.full_name,
      whatsapp: parsed.data.whatsapp || null,
    })

    return NextResponse.json({ data: toProfile(profile) }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

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

    const menteeIds = rows.map((r) => r.id)
    const bookingCounts =
      menteeIds.length > 0
        ? await db
            .select({ menteeId: bookings.menteeId, cnt: count(bookings.id) })
            .from(bookings)
            .where(
              and(
                inArray(bookings.menteeId, menteeIds),
                eq(bookings.status, "completed"),
              ),
            )
            .groupBy(bookings.menteeId)
        : []

    const countMap = new Map(bookingCounts.map((r) => [r.menteeId, r.cnt]))

    return NextResponse.json({
      data: rows.map((row) => ({ ...toProfile(row), booking_count: countMap.get(row.id) ?? 0 })),
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
