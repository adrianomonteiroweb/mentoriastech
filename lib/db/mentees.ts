import { eq } from "drizzle-orm"
import { db, profiles } from "@/lib/db"

type OriginCategory = "linkedin" | "palestra" | "indicacao" | "instagram" | "evento"

interface EnsureMenteeInput {
  email: string
  fullName: string
  whatsapp?: string | null
  originCategory?: OriginCategory | null
  originDescription?: string | null
  updateExisting?: boolean
  updateOriginIfMissing?: boolean
}

export async function ensureMenteeProfile({
  email,
  fullName,
  whatsapp,
  originCategory,
  originDescription,
  updateExisting = false,
  updateOriginIfMissing = false,
}: EnsureMenteeInput) {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedOriginDescription = originDescription?.trim() || null

  const [existingProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, normalizedEmail))
    .limit(1)

  if (existingProfile) {
    const shouldUpdateOrigin =
      updateOriginIfMissing && originCategory && !existingProfile.originCategory

    if (!updateExisting && !shouldUpdateOrigin) {
      return existingProfile
    }

    const updateData: Partial<typeof profiles.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (updateExisting) {
      updateData.fullName = fullName || existingProfile.fullName
      updateData.whatsapp = whatsapp || existingProfile.whatsapp
    }

    if (shouldUpdateOrigin) {
      updateData.originCategory = originCategory
      updateData.originDescription =
        normalizedOriginDescription || existingProfile.originDescription
    }

    const [updatedProfile] = await db
      .update(profiles)
      .set(updateData)
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
      originCategory: originCategory || null,
      originDescription: normalizedOriginDescription,
    })
    .returning()

  return profile
}
