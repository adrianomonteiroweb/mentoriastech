import bcrypt from "bcryptjs"
import { and, desc, eq, gt, isNull } from "drizzle-orm"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db, menteeAccessCodes, menteeAccessSessions } from "@/lib/db"
import {
  MENTEE_ACCESS_COOKIE,
  SESSION_TTL_DAYS,
  normalizeEmail,
} from "@/lib/utils/mentee-access"

const MAX_ATTEMPTS = 5

const schema = z.object({
  email: z.string().email("Email inválido"),
  code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const email = normalizeEmail(parsed.data.email)
    const code = parsed.data.code

    // Bypass de desenvolvimento: cria sessão diretamente sem validar código
    if (process.env.NODE_ENV === "development" && code === "000000") {
      const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
      const [session] = await db
        .insert(menteeAccessSessions)
        .values({ email, expiresAt })
        .returning()

      const cookieStore = await cookies()
      cookieStore.set(MENTEE_ACCESS_COOKIE, session.id, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      })

      return NextResponse.json({ success: true })
    }

    const [activeCode] = await db
      .select()
      .from(menteeAccessCodes)
      .where(
        and(
          eq(menteeAccessCodes.email, email),
          isNull(menteeAccessCodes.usedAt),
          gt(menteeAccessCodes.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(menteeAccessCodes.createdAt))
      .limit(1)

    if (!activeCode) {
      return NextResponse.json(
        { error: "Código inválido ou expirado. Solicite um novo código." },
        { status: 401 },
      )
    }

    if (activeCode.attempts >= MAX_ATTEMPTS) {
      await db
        .update(menteeAccessCodes)
        .set({ usedAt: new Date() })
        .where(eq(menteeAccessCodes.id, activeCode.id))

      return NextResponse.json(
        { error: "Muitas tentativas. Solicite um novo código." },
        { status: 429 },
      )
    }

    const isValid = await bcrypt.compare(code, activeCode.codeHash)

    if (!isValid) {
      await db
        .update(menteeAccessCodes)
        .set({ attempts: activeCode.attempts + 1 })
        .where(eq(menteeAccessCodes.id, activeCode.id))

      return NextResponse.json(
        { error: "Código incorreto. Verifique e tente novamente." },
        { status: 401 },
      )
    }

    await db
      .update(menteeAccessCodes)
      .set({ usedAt: new Date() })
      .where(eq(menteeAccessCodes.id, activeCode.id))

    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
    const [session] = await db
      .insert(menteeAccessSessions)
      .values({ email, expiresAt })
      .returning()

    const cookieStore = await cookies()
    cookieStore.set(MENTEE_ACCESS_COOKIE, session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[minhas-mentorias/verify-code] Error:", error)
    return NextResponse.json(
      { error: "Erro ao verificar código" },
      { status: 500 },
    )
  }
}
