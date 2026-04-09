import { createClient } from "@/lib/supabase/server"
import type { Profile, UserRole } from "@/lib/types/database"

/**
 * Obtém a sessão do usuário autenticado.
 * Retorna null se não autenticado.
 */
export async function getSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Obtém o perfil completo do usuário autenticado.
 * Retorna null se não autenticado ou perfil não encontrado.
 */
export async function getProfile(): Promise<Profile | null> {
  const user = await getSession()
  if (!user) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return data as Profile | null
}

/**
 * Exige autenticação. Retorna o user ou lança erro.
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
 * Exige uma role específica. Retorna o profile ou lança erro.
 * Usar em API routes admin/HR.
 */
export async function requireRole(...roles: UserRole[]) {
  const user = await requireAuth()

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || !roles.includes(profile.role as UserRole)) {
    throw new AuthError("Acesso nao autorizado", 403)
  }

  return profile as Profile
}

/**
 * Erro de autenticação com status HTTP.
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
 * Handler helper para API routes com autenticação.
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
