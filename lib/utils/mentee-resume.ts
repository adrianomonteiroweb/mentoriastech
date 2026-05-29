import { desc, eq } from "drizzle-orm"
import { bookings, db, profiles } from "@/lib/db"
import { ensureMenteeProfile } from "@/lib/db/mentees"
import { isLegacyPublicResumeUrl, isProtectedResumePath } from "@/lib/utils/resume-access"

/**
 * Helpers compartilhados pelas rotas de currículo da área "Minhas Mentorias",
 * que operam por email (sessão de mentee-access) e não por profile JWT.
 */

export async function getProfileByEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, normalized))
    .limit(1)
  return profile || null
}

/**
 * Retorna o pathname utilizável do currículo (blob privado) ou null quando
 * ausente, legado (URL pública antiga) ou inválido.
 */
export function usableResumePathname(resumeUrl: string | null | undefined): string | null {
  if (!resumeUrl) return null
  if (isLegacyPublicResumeUrl(resumeUrl)) return null
  if (!isProtectedResumePath(resumeUrl)) return null
  return resumeUrl
}

/**
 * Resolve (ou cria) o profile para o email da sessão. Mentorados que agendaram
 * como guest podem não ter profile ainda — neste caso criamos um mínimo,
 * derivando o nome do booking mais recente.
 */
export async function ensureProfileForMenteeEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  const existing = await getProfileByEmail(normalized)
  if (existing) return existing

  const [latestBooking] = await db
    .select({ guestName: bookings.guestName })
    .from(bookings)
    .where(eq(bookings.guestEmail, normalized))
    .orderBy(desc(bookings.createdAt))
    .limit(1)

  const fallbackName = normalized.split("@")[0] || "Mentorado"
  const fullName = latestBooking?.guestName?.trim() || fallbackName

  return ensureMenteeProfile({ email: normalized, fullName })
}
