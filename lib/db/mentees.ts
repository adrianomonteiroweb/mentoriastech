import { eq } from "drizzle-orm"
import { db, profiles } from "@/lib/db"

interface EnsureMenteeInput {
  email: string
  fullName: string
  whatsapp?: string | null
  updateExisting?: boolean
}

export async function ensureMenteeProfile({
  email,
  fullName,
  whatsapp,
  updateExisting = false,
}: EnsureMenteeInput) {
  const normalizedEmail = email.trim().toLowerCase()

  const [existingProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, normalizedEmail))
    .limit(1)

  if (existingProfile) {
    if (!updateExisting) {
      return existingProfile
    }

    const [updatedProfile] = await db
      .update(profiles)
      .set({
        fullName: fullName || existingProfile.fullName,
        whatsapp: whatsapp || existingProfile.whatsapp,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, existingProfile.id))
      .returning()

    return updatedProfile || existingProfile
  }

  const [profile] = await db
    .insert(profiles)
    .values({
      email: normalizedEmail,
      role: "mentee",
      fullName,
      whatsapp,
    })
    .returning()

  return profile
}
