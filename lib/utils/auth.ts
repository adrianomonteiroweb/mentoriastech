import { and, eq, gt } from "drizzle-orm"
import { cookies } from "next/headers"
import { db, profiles, sessions } from "@/lib/db"
import { toProfile } from "@/lib/db/mappers"
import type { Profile, UserRole } from "@/lib/types/database"

export const SESSION_COOKIE = "session_id"

export interface AuthUser {
  id: string
  email: string
}

/**
 * Obtem a sessao do usuario autenticado.
 * Retorna null se nao autenticado ou se a sessao expirou.
 */
export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId) return null

  const [row] = await db
    .select({ session: sessions, profile: profiles })
    .from(sessions)
    .innerJoin(profiles, eq(sessions.userId, profiles.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1)

  if (!row?.profile) return null

  return {
    id: row.profile.id,
    email: row.profile.email,
  }
}

/**
 * Obtem o perfil completo do usuario autenticado.
 * Retorna null se nao autenticado ou perfil nao encontrado.
 */
export async function getProfile(): Promise<Profile | null> {
  const user = await getSession()
  if (!user) return null

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)

  return profile ? toProfile(profile) : null
}

/**
 * Exige autenticacao. Retorna o user ou lanca erro.
 * Usar em API routes.
 */
export async function requireAuth() {
  const user = await getSession()
  if (!user) {
    throw new AuthError("Nao autenticado", 401)
  }
  return user
}

/**
 * Exige uma role especifica. Retorna o profile ou lanca erro.
 * Usar em API routes admin/HR.
 */
export async function requireRole(...roles: UserRole[]) {
  const user = await requireAuth()

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)

  if (!profile || !roles.includes(profile.role as UserRole)) {
    throw new AuthError("Acesso nao autorizado", 403)
  }

  return toProfile(profile)
}

/**
 * Erro de autenticacao com status HTTP.
 */
export class AuthError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "AuthError"
    this.status = status
  }
}

/**
 * Handler helper para API routes com autenticacao.
 * Captura AuthError e retorna JSON com status correto.
 */
export function withAuth(
  handler: (request: Request) => Promise<Response>,
) {
  return async (request: Request) => {
    try {
      return await handler(request)
    } catch (error) {
      if (error instanceof AuthError) {
        return Response.json(
          { error: error.message },
          { status: error.status },
        )
      }
      console.error("[API] Unexpected error:", error)
      return Response.json(
        { error: "Erro interno do servidor" },
        { status: 500 },
      )
    }
  }
}
