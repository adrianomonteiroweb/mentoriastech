import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, paidMentorships, profiles } from "@/lib/db"
import { toPaidMentorship } from "@/lib/db/mappers"
import {
  grantMentorRole,
  isPaidMentorshipsMissingError,
  PAID_MENTORSHIPS_MIGRATION_ERROR,
  paidMentorshipUpdateSchema,
} from "@/lib/paid-mentorships"
import { requireMentorAccess, getMentorId } from "@/lib/utils/auth"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)
    const { id } = await params
    const body = await request.json()
    const parsed = paidMentorshipUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const updateData: Partial<typeof paidMentorships.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description
    if (parsed.data.image_url !== undefined) updateData.imageUrl = parsed.data.image_url || null
    if (parsed.data.image_alt !== undefined) updateData.imageAlt = parsed.data.image_alt || null
    if (parsed.data.amount_cents !== undefined) updateData.amountCents = parsed.data.amount_cents
    if (parsed.data.currency !== undefined) updateData.currency = parsed.data.currency
    if (parsed.data.pix_expires_after_seconds !== undefined) {
      updateData.pixExpiresAfterSeconds = parsed.data.pix_expires_after_seconds
    }
    if (parsed.data.pix_amount_includes_iof !== undefined) {
      updateData.pixAmountIncludesIof = parsed.data.pix_amount_includes_iof
    }
    if (parsed.data.mentor_email !== undefined) {
      const newEmail = parsed.data.mentor_email.toLowerCase()
      updateData.mentorEmail = newEmail
      const [mentorProfile] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.email, newEmail))
        .limit(1)
      if (mentorProfile) updateData.mentorId = mentorProfile.id
    }
    if (parsed.data.sort_order !== undefined) updateData.sortOrder = parsed.data.sort_order
    if (parsed.data.is_active !== undefined) updateData.isActive = parsed.data.is_active

    const ownershipFilter = profile.role === "admin"
      ? eq(paidMentorships.id, id)
      : and(eq(paidMentorships.id, id), eq(paidMentorships.mentorId, mentorId))

    const [row] = await db
      .update(paidMentorships)
      .set(updateData)
      .where(ownershipFilter)
      .returning()

    if (!row) {
      return NextResponse.json({ error: "Mentoria paga nao encontrada" }, { status: 404 })
    }

    const mentorRoleGranted = updateData.mentorEmail
      ? await grantMentorRole(updateData.mentorEmail, profile.id)
      : false

    return NextResponse.json({
      data: toPaidMentorship(row),
      mentor_admin_granted: mentorRoleGranted,
    })
  } catch (error) {
    if (isPaidMentorshipsMissingError(error)) {
      return NextResponse.json({ error: PAID_MENTORSHIPS_MIGRATION_ERROR }, { status: 500 })
    }

    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)
    const { id } = await params

    const ownershipFilter = profile.role === "admin"
      ? eq(paidMentorships.id, id)
      : and(eq(paidMentorships.id, id), eq(paidMentorships.mentorId, mentorId))

    const [deleted] = await db
      .delete(paidMentorships)
      .where(ownershipFilter)
      .returning()

    if (!deleted) {
      return NextResponse.json({ error: "Mentoria paga nao encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isPaidMentorshipsMissingError(error)) {
      return NextResponse.json({ error: PAID_MENTORSHIPS_MIGRATION_ERROR }, { status: 500 })
    }

    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
