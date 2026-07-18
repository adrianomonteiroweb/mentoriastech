import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db, paidMentorships, profiles, userRoles } from "@/lib/db"
import { signToken } from "@/lib/auth/jwt"
import { AUTH_COOKIE, authCookieOptions } from "@/lib/auth/cookies"
import { requiredWhatsAppSchema } from "@/lib/whatsapp-schema"

const BCRYPT_ROUNDS = 12

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  fullName: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres"),
  whatsapp: requiredWhatsAppSchema,
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const email = parsed.data.email.toLowerCase()

    const [existing] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: "Este email ja esta cadastrado." },
        { status: 409 },
      )
    }

    const [mentorAssignment] = await db
      .select({ id: paidMentorships.id })
      .from(paidMentorships)
      .where(eq(paidMentorships.mentorEmail, email))
      .limit(1)

    if (!mentorAssignment) {
      return NextResponse.json(
        { error: "Cadastro restrito a mentores convidados. Use o e-mail informado pelo administrador." },
        { status: 403 },
      )
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS)

    const [newUser] = await db
      .insert(profiles)
      .values({
        email,
        fullName: parsed.data.fullName,
        whatsapp: parsed.data.whatsapp,
        passwordHash,
        role: "mentor",
      })
      .returning({ id: profiles.id, email: profiles.email, role: profiles.role })

    if (!newUser) {
      return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 })
    }

    await db.insert(userRoles).values({
      userId: newUser.id,
      role: newUser.role,
      assignedBy: null,
    }).onConflictDoNothing()

    await db
      .update(paidMentorships)
      .set({ mentorId: newUser.id, updatedAt: new Date() })
      .where(eq(paidMentorships.mentorEmail, email))

    const token = await signToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    })

    const response = NextResponse.json({
      data: { id: newUser.id, email: newUser.email },
    })
    response.cookies.set(AUTH_COOKIE, token, authCookieOptions())

    return response
  } catch (error) {
    console.error("[auth/register] Error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
