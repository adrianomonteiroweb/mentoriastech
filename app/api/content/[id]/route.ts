import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("content_items")
      .select("*, content_categories(name, slug)")
      .eq("id", id)
      .eq("is_published", true)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Conteudo nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[content] Error:", error)
    return NextResponse.json({ error: "Erro ao carregar conteudo" }, { status: 500 })
  }
}
