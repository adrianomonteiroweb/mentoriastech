import { randomUUID } from "crypto"
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db, profiles } from "@/lib/db"

interface EnsureMenteeInput {
  email: string
  fullName: string
  whatsapp?: string | null
}

export async function ensureMenteeProfile({
  email,
  fullName,
  whatsapp,
}: EnsureMenteeInput) {
  const normalizedEmail = email.trim().toLowerCase()

  const [existingProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, normalizedEmail))
    .limit(1)

  if (existingProfile) {
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

  const passwordHash = await bcrypt.hash(randomUUID(), 10)
  const [profile] = await db
    .insert(profiles)
    .values({
      email: normalizedEmail,
      passwordHash,
      role: "mentee",
      fullName,
      whatsapp,
    })
    .returning()

  return profile
}
