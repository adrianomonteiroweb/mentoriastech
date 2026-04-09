import { NextResponse } from "next/server"
import { requireRole } from "@/lib/utils/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.enum(["free", "paid"]).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin")
    const { id } = await params
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("mentoring_topics")
      .update(parsed.data)
      .eq("id", id)
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin")
    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase.from("mentoring_topics").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
