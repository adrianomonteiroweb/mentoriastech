import { eq } from "drizzle-orm"
import { z } from "zod"
import { db, profiles, userRoles } from "@/lib/db"

export const paidMentorshipSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().max(4000).optional().default(""),
  image_url: z.string().url().optional().or(z.literal("")),
  image_alt: z.string().trim().max(500).optional(),
  amount_cents: z.number().int().min(50),
  currency: z.literal("BRL").default("BRL"),
  pix_expires_after_seconds: z.number().int().min(10).max(1209600).default(86400),
  pix_amount_includes_iof: z.enum(["never", "always"]).default("never"),
  mentor_email: z.string().trim().email(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
})

export const paidMentorshipUpdateSchema = paidMentorshipSchema.partial()

export const PAID_MENTORSHIPS_MIGRATION_ERROR =
  "Aplique a migration 027_paid_mentorships_stripe_pix.sql antes de gerenciar mentorias pagas."

export function isPaidMentorshipsMissingError(error: unknown) {
  const candidate = error as { code?: string; cause?: { code?: string } }
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase()
  const causeMessage = ((error as { cause?: unknown }).cause instanceof Error
    ? ((error as { cause?: Error }).cause?.message || "")
    : "").toLowerCase()

  return (
    candidate.code === "42P01" ||
    candidate.cause?.code === "42P01" ||
    message.includes('relation "paid_mentorships" does not exist') ||
    causeMessage.includes('relation "paid_mentorships" does not exist')
  )
}

export async function grantMentorRole(email: string, assignedBy: string) {
  const normalizedEmail = email.trim().toLowerCase()

  const [profile] = await db
    .select({ id: profiles.id, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.email, normalizedEmail))
    .limit(1)

  if (!profile) return false

  if (profile.role !== "admin" && profile.role !== "mentor") {
    await db
      .update(profiles)
      .set({ role: "mentor", updatedAt: new Date() })
      .where(eq(profiles.id, profile.id))
  }

  await db
    .insert(userRoles)
    .values({
      userId: profile.id,
      role: profile.role === "admin" ? "admin" : "mentor",
      assignedBy,
      assignedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userRoles.userId,
      set: {
        role: profile.role === "admin" ? "admin" : "mentor",
        assignedBy,
        assignedAt: new Date(),
        updatedAt: new Date(),
      },
    })

  return true
}

/** @deprecated Use grantMentorRole instead */
export const grantMentorAdminRole = grantMentorRole
