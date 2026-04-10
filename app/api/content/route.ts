import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    let query = supabase
      .from("content_items")
      .select("*, content_categories(name, slug)")
      .eq("is_published", true)
      .order("created_at", { ascending: false })

    if (category) {
      query = query.eq("content_categories.slug", category)
    }

    const { data, error } = await query

    if (error) throw error

    // Buscar categorias para filtros
    const { data: categories } = await supabase
      .from("content_categories")
      .select("*")
      .order("sort_order")

    return NextResponse.json({ data, categories })
  } catch (error) {
    console.error("[content] Error:", error)
    return NextResponse.json({ error: "Erro ao carregar conteudos" }, { status: 500 })
  }
}
