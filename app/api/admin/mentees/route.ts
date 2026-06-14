import { NextResponse } from "next/server"
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { db, profiles, bookings, selectionProcesses, selectionProcessCandidates } from "@/lib/db"
import { toProfile } from "@/lib/db/mappers"
import type { MenteeSelectionProcessSummary } from "@/lib/types/database"
import { requireMentorAccess, getMentorId, requireRole } from "@/lib/utils/auth"
import { ensureMenteeProfile } from "@/lib/db/mentees"
import { safeProfileResumeHref } from "@/lib/utils/resume-access"
import { z } from "zod"

const createMenteeSchema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  whatsapp: z.string().optional(),
})

const careerStatusValues = ["seeking", "interning", "employed", "student", "other"] as const
const seniorityValues = ["junior", "mid", "senior", "undefined"] as const
const originCategoryValues = ["linkedin", "palestra", "indicacao", "instagram", "evento"] as const

function isInValues<T extends readonly string[]>(value: string | null, values: T): value is T[number] {
  return !!value && values.includes(value as T[number])
}

export async function POST(request: Request) {
  try {
    await requireMentorAccess()
    const body = await request.json()

    const parsed = createMenteeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const profile = await ensureMenteeProfile({
      email: parsed.data.email,
      fullName: parsed.data.full_name,
      whatsapp: parsed.data.whatsapp || null,
      updateExisting: true,
    })

    const data = toProfile(profile)
    return NextResponse.json(
      { data: { ...data, resume_url: safeProfileResumeHref(data.id, data.resume_url) } },
      { status: 201 },
    )
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET(request: Request) {
  try {
    const actorProfile = await requireRole("admin", "mentor", "hr")
    const { searchParams } = new URL(request.url)

    const search = searchParams.get("search")?.trim()
    const history = searchParams.get("history")
    const linkedin = searchParams.get("linkedin")
    const resume = searchParams.get("resume")
    const portfolio = searchParams.get("portfolio")
    const careerStatus = searchParams.get("career_status")
    const seniority = searchParams.get("seniority")
    const origin = searchParams.get("origin")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")

    const filters = [eq(profiles.role, "mentee")]

    if (actorProfile.role === "mentor") {
      const actorMentorId = getMentorId(actorProfile)
      filters.push(sql`EXISTS (
        SELECT 1 FROM ${bookings}
        WHERE ${bookings.menteeId} = ${profiles.id}
        AND ${bookings.mentorId} = ${actorMentorId}
      )`)
    }
    if (search) {
      filters.push(
        or(
          ilike(profiles.fullName, `%${search}%`),
          ilike(profiles.email, `%${search}%`),
        )!,
      )
    }
    if (history === "with") {
      filters.push(sql`EXISTS (
        SELECT 1 FROM ${bookings}
        WHERE ${bookings.menteeId} = ${profiles.id}
        AND ${bookings.status} = 'completed'
      )`)
    } else if (history === "without") {
      filters.push(sql`NOT EXISTS (
        SELECT 1 FROM ${bookings}
        WHERE ${bookings.menteeId} = ${profiles.id}
        AND ${bookings.status} = 'completed'
      )`)
    }
    if (linkedin === "with") {
      filters.push(sql`${profiles.linkedinUrl} IS NOT NULL AND ${profiles.linkedinUrl} <> ''`)
    } else if (linkedin === "without") {
      filters.push(sql`(${profiles.linkedinUrl} IS NULL OR ${profiles.linkedinUrl} = '')`)
    }
    if (resume === "with") {
      filters.push(sql`${profiles.resumeUrl} IS NOT NULL AND ${profiles.resumeUrl} <> ''`)
    } else if (resume === "without") {
      filters.push(sql`(${profiles.resumeUrl} IS NULL OR ${profiles.resumeUrl} = '')`)
    }
    if (portfolio === "with") {
      filters.push(sql`${profiles.portfolioUrl} IS NOT NULL AND ${profiles.portfolioUrl} <> ''`)
    } else if (portfolio === "without") {
      filters.push(sql`(${profiles.portfolioUrl} IS NULL OR ${profiles.portfolioUrl} = '')`)
    }
    if (isInValues(careerStatus, careerStatusValues)) {
      filters.push(eq(profiles.careerStatus, careerStatus))
    }
    if (isInValues(seniority, seniorityValues)) {
      filters.push(eq(profiles.seniority, seniority))
    }
    if (isInValues(origin, originCategoryValues)) {
      filters.push(eq(profiles.originCategory, origin))
    } else if (origin === "none") {
      filters.push(sql`(${profiles.originCategory} IS NULL OR ${profiles.originCategory} = '')`)
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

    const selectionProcessRows =
      menteeIds.length > 0
        ? await db
            .select({
              menteeId: selectionProcessCandidates.menteeId,
              id: selectionProcesses.id,
              company: selectionProcesses.company,
              position: selectionProcesses.position,
              status: selectionProcesses.status,
            })
            .from(selectionProcessCandidates)
            .innerJoin(selectionProcesses, eq(selectionProcessCandidates.processId, selectionProcesses.id))
            .where(inArray(selectionProcessCandidates.menteeId, menteeIds))
        : []

    const selectionProcessMap = new Map<string, MenteeSelectionProcessSummary[]>()
    for (const row of selectionProcessRows) {
      const list = selectionProcessMap.get(row.menteeId) || []
      list.push({ id: row.id, company: row.company, position: row.position, status: row.status })
      selectionProcessMap.set(row.menteeId, list)
    }

    return NextResponse.json({
      data: rows.map((row) => {
        const profile = toProfile(row)
        return {
          ...profile,
          resume_url: safeProfileResumeHref(profile.id, profile.resume_url),
          booking_count: countMap.get(row.id) ?? 0,
          selection_processes: selectionProcessMap.get(row.id) ?? [],
        }
      }),
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
