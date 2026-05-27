import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { LEGACY_SESSION_COOKIE } from "@/lib/utils/auth-cookies"

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const email = parsed.data.email.toLowerCase()
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    })

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Email ou senha incorretos." },
        { status: 401 },
      )
    }

    const response = NextResponse.json({
      data: {
        id: data.user.id,
        email: data.user.email ?? email,
      },
    })
    response.cookies.delete(LEGACY_SESSION_COOKIE)

    return response
  } catch (error) {
    console.error("[auth/login] Error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
