import { NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db, profiles } from "@/lib/db"
import { requireAuth } from "@/lib/utils/auth"
import { AuthError } from "@/lib/utils/auth"

const BCRYPT_ROUNDS = 12

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual obrigatoria"),
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
})

export async function POST(request: Request) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Dados invalidos"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const [profile] = await db
      .select({ passwordHash: profiles.passwordHash })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1)

    if (!profile || !profile.passwordHash) {
      return NextResponse.json(
        { error: "Nenhuma senha cadastrada. Entre em contato com o administrador." },
        { status: 400 },
      )
    }

    const valid = await bcrypt.compare(parsed.data.currentPassword, profile.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 })
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_ROUNDS)

    await db
      .update(profiles)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(profiles.id, user.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[auth/change-password] Error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
