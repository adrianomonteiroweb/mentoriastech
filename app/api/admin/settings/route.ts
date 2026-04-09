import { NextResponse } from "next/server"
import { requireRole } from "@/lib/utils/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    await requireRole("admin")
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("site_settings")
      .select("*")

    if (error) throw error

    // Converter array em objeto key-value
    const settings = Object.fromEntries(
      (data || []).map((s) => [s.key, s.value]),
    )

    return NextResponse.json({ data: settings })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole("admin")
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ error: "key e value sao obrigatorios" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("site_settings")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
