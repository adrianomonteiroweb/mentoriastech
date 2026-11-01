import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/utils/auth"
import { db, sitePrivateSettings } from "@/lib/db"
import {
  BOOKINGS_BOT_TOKEN_SETTING_KEY,
  getBookingsBotToken,
  botTokenSchema,
} from "@/lib/bot-token"

// Não cacheia: o admin precisa ver o token atual logo após salvar.
export const dynamic = "force-dynamic"

const bodySchema = z.object({ token: botTokenSchema })

// GET: token atual do bot de confirmação de mentorias (completo, para o admin copiar).
export async function GET() {
  try {
    await requireRole("admin")
    const data = await getBookingsBotToken()
    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

// PUT: grava um token novo. Invalida o anterior imediatamente.
export async function PUT(request: Request) {
  try {
    await requireRole("admin")
    const parsed = bodySchema.safeParse(await request.json())

    if (!parsed.success) {
      const message = parsed.error.flatten().fieldErrors.token?.[0] || "Token inválido"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const value = { token: parsed.data.token }

    await db
      .insert(sitePrivateSettings)
      .values({ key: BOOKINGS_BOT_TOKEN_SETTING_KEY, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: sitePrivateSettings.key,
        set: { value, updatedAt: new Date() },
      })

    return NextResponse.json({ data: { token: parsed.data.token, source: "db" } })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
