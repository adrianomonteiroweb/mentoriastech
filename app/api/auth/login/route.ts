import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db, profiles, sessions } from "@/lib/db"
import { toProfile } from "@/lib/db/mappers"
import { SESSION_COOKIE } from "@/lib/utils/auth"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const SESSION_DAYS = 7

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, parsed.data.email.toLowerCase()))
      .limit(1)

    const validPassword = profile
      ? await bcrypt.compare(parsed.data.password, profile.passwordHash)
      : false

    if (!profile || !validPassword) {
      return NextResponse.json(
        { error: "Email ou senha incorretos." },
        { status: 401 },
      )
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS)

    const [session] = await db
      .insert(sessions)
      .values({
        userId: profile.id,
        expiresAt,
      })
      .returning()

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    })

    return NextResponse.json({ data: toProfile(profile) })
  } catch (error) {
    console.error("[auth/login] Error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
