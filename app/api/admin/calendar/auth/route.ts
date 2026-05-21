import { NextResponse } from "next/server"
import { requireRole } from "@/lib/utils/auth"
import { getConsentUrl, exchangeCodeForTokens } from "@/lib/google-calendar"
import { createAdminClient } from "@/lib/supabase/admin"
import { db, siteSettings } from "@/lib/db"

// GET: Gera URL de consentimento OAuth
export async function GET(request: Request) {
  try {
    await requireRole("admin")
    const { origin } = new URL(request.url)
    const redirectUri = `${origin}/api/admin/calendar/auth`

    const url = getConsentUrl(redirectUri)
    return NextResponse.json({ url })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

// POST: Troca code por tokens e salva refresh_token
export async function POST(request: Request) {
  try {
    await requireRole("admin")
    const { code } = await request.json()
    const { origin } = new URL(request.url)
    const redirectUri = `${origin}/api/admin/calendar/auth`

    if (!code) {
      return NextResponse.json({ error: "Code obrigatorio" }, { status: 400 })
    }

    const tokens = await exchangeCodeForTokens(code, redirectUri)

    if (!tokens.refresh_token) {
      return NextResponse.json(
        { error: "Nenhum refresh_token retornado. Tente revogar o acesso em myaccount.google.com e reconectar." },
        { status: 400 },
      )
    }

    // Salvar refresh_token nas configurações do site
    const value = {
      refresh_token: tokens.refresh_token,
      connected_at: new Date().toISOString(),
    }

    await db
      .insert(siteSettings)
      .values({
        key: "google_calendar",
        value,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: {
          value,
          updatedAt: new Date(),
        },
      })

    const supabase = createAdminClient()
    await supabase.from("site_settings").upsert(
      {
        key: "google_calendar",
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[calendar auth] Error:", error)
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro ao conectar Google Calendar"
    return NextResponse.json({ error: message }, { status })
  }
}
