import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAuth } from "@/lib/utils/auth"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const createSchema = z.object({
  title: z.string().min(3),
  company: z.string().min(2),
  description: z.string().min(10),
  location: z.string().optional(),
  job_type: z.enum(["remote", "hybrid", "onsite"]).default("remote"),
  salary_range: z.string().optional(),
  application_url: z.string().url().optional(),
})

// GET: listar vagas aprovadas (público)
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("jobs")
      .select("*, profiles(full_name)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[jobs] Error:", error)
    return NextResponse.json({ error: "Erro ao carregar vagas" }, { status: 500 })
  }
}

// POST: criar vaga (autenticado)
export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // Buscar role do usuário
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    // HR e admin: vaga auto-aprovada. Mentee: pendente
    const autoApprove = profile?.role === "hr" || profile?.role === "admin"

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from("jobs")
      .insert({
        ...parsed.data,
        posted_by: user.id,
        status: autoApprove ? "approved" : "pending",
        approved_by: autoApprove ? user.id : null,
        approved_at: autoApprove ? new Date().toISOString() : null,
      })
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
