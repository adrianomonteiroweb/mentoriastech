import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/utils/auth"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  company: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  location: z.string().optional(),
  job_type: z.enum(["remote", "hybrid", "onsite"]).optional(),
  salary_range: z.string().optional(),
  application_url: z.string().url().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verificar se é o dono e se está pendente
    const { data: job } = await supabase
      .from("jobs")
      .select("posted_by, status")
      .eq("id", id)
      .single()

    if (!job) {
      return NextResponse.json({ error: "Vaga nao encontrada" }, { status: 404 })
    }

    if (job.posted_by !== user.id) {
      return NextResponse.json({ error: "Acesso nao autorizado" }, { status: 403 })
    }

    if (job.status !== "pending") {
      return NextResponse.json(
        { error: "Apenas vagas pendentes podem ser editadas" },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from("jobs")
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
