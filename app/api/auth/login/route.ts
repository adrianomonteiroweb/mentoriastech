import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db, profiles } from "@/lib/db"
import { signToken } from "@/lib/auth/jwt"
import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth/cookies"

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

const GENERIC_ERROR = "Email ou senha incorretos."

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const email = parsed.data.email.toLowerCase()

    const [user] = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        role: profiles.role,
        passwordHash: profiles.passwordHash,
      })
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1)

    if (!user || !user.passwordHash) {
      // Constant-time: still run bcrypt compare to prevent timing attacks
      await bcrypt.compare(parsed.data.password, "$2b$12$invalid.hash.placeholder.for.timing")
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
    }

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const response = NextResponse.json({
      data: { id: user.id, email: user.email },
    })
    response.cookies.set(AUTH_COOKIE, token, authCookieOptions())

    return response
  } catch (error) {
    console.error("[auth/login] Error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
