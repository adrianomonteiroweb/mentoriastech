import { NextResponse } from "next/server"
import { requireRole } from "@/lib/utils/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(2),
  category: z.enum(["free", "paid"]),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
})

export async function GET() {
  try {
    await requireRole("admin")
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("mentoring_topics")
      .select("*")
      .order("sort_order")

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin")
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("mentoring_topics")
      .insert(parsed.data)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
