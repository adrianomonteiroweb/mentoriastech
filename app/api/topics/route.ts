import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: topics, error } = await supabase
      .from("mentoring_topics")
      .select("id, name, category, description")
      .eq("is_active", true)
      .order("sort_order")

    if (error) {
      console.error("[topics] Error:", error)
      return NextResponse.json({ error: "Erro ao carregar temas" }, { status: 500 })
    }

    return NextResponse.json({ topics })
  } catch (error) {
    console.error("[topics] Error:", error)
    return NextResponse.json({ error: "Erro ao carregar temas" }, { status: 500 })
  }
}
