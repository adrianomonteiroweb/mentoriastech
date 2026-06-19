import { NextResponse } from "next/server"
import { asc, eq } from "drizzle-orm"
import { db, paidMentorships, profiles } from "@/lib/db"
import { toPaidMentorship } from "@/lib/db/mappers"
import {
  grantMentorRole,
  isPaidMentorshipsMissingError,
  PAID_MENTORSHIPS_MIGRATION_ERROR,
  paidMentorshipSchema,
} from "@/lib/paid-mentorships"
import { requireMentorAccess, getMentorId } from "@/lib/utils/auth"

export async function GET(request: Request) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)

    const url = new URL(request.url)
    const filterMentorId = profile.role === "admin"
      ? url.searchParams.get("mentorId") || null
      : mentorId

    const rows = await db
      .select()
      .from(paidMentorships)
      .where(filterMentorId ? eq(paidMentorships.mentorId, filterMentorId) : undefined)
      .orderBy(asc(paidMentorships.sortOrder), asc(paidMentorships.createdAt))

    return NextResponse.json({ data: rows.map(toPaidMentorship) })
  } catch (error) {
    if (isPaidMentorshipsMissingError(error)) {
      return NextResponse.json({ error: PAID_MENTORSHIPS_MIGRATION_ERROR }, { status: 500 })
    }

    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireMentorAccess()
    const body = await request.json()
    const parsed = paidMentorshipSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const mentorEmail = parsed.data.mentor_email.toLowerCase()

    const [mentorProfile] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.email, mentorEmail))
      .limit(1)

    const [row] = await db
      .insert(paidMentorships)
      .values({
        title: parsed.data.title,
        description: parsed.data.description,
        imageUrl: parsed.data.image_url || null,
        imageAlt: parsed.data.image_alt || parsed.data.title,
        amountCents: parsed.data.amount_cents,
        currency: parsed.data.currency,
        pixExpiresAfterSeconds: parsed.data.pix_expires_after_seconds,
        pixAmountIncludesIof: parsed.data.pix_amount_includes_iof,
        mentorId: mentorProfile?.id || null,
        mentorEmail,
        sortOrder: parsed.data.sort_order,
        isActive: parsed.data.is_active,
        createdBy: actor.id,
      })
      .returning()

    const mentorRoleGranted = await grantMentorRole(mentorEmail, actor.id)

    return NextResponse.json(
      { data: toPaidMentorship(row), mentor_admin_granted: mentorRoleGranted },
      { status: 201 },
    )
  } catch (error) {
    if (isPaidMentorshipsMissingError(error)) {
      return NextResponse.json({ error: PAID_MENTORSHIPS_MIGRATION_ERROR }, { status: 500 })
    }

    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
