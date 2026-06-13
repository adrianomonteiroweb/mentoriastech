import { cookies } from "next/headers"
import { eq } from "drizzle-orm"
import { db, profiles } from "@/lib/db"
import { toProfile } from "@/lib/db/mappers"
import { verifyToken } from "@/lib/auth/jwt"
import { AUTH_COOKIE } from "@/lib/auth/cookies"
import type { Profile, UserRole } from "@/lib/types/database"

export interface AuthUser {
  id: string
  email: string
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE)?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  return { id: payload.sub, email: payload.email as string }
}

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

export async function requireAuth() {
  const user = await getSession()
  if (!user) {
    throw new AuthError("Nao autenticado", 401)
  }
  return user
}

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

export async function requireMentorAccess() {
  return requireRole("admin", "mentor")
}

export function getMentorId(profile: Profile): string {
  return profile.id
}

export async function getDefaultMentorId(): Promise<string> {
  const [admin] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.role, "admin"))
    .limit(1)

  if (!admin) throw new Error("Admin profile not found")
  return admin.id
}

export class AuthError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "AuthError"
    this.status = status
  }
}

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
