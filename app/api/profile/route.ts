import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/utils/auth"
import { createClient } from "@/lib/supabase/server"
import { safeOwnResumeHref } from "@/lib/utils/resume-access"
import { z } from "zod"

const updateSchema = z.object({
  full_name: z.string().min(2).optional(),
  whatsapp: z.string().optional(),
  linkedin_url: z.string().url().optional().or(z.literal("")),
  bio: z.string().max(500).optional(),
})

export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: "Perfil nao encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        ...data,
        resume_url: safeOwnResumeHref(data.resume_url),
      },
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .update(parsed.data)
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      console.error("[profile] Update error:", error)
      return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        ...data,
        resume_url: safeOwnResumeHref(data.resume_url),
      },
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
