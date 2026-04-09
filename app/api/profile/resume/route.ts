import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/utils/auth"
import { createClient } from "@/lib/supabase/server"
import { uploadFile, UploadError } from "@/lib/utils/upload"

export async function POST(request: Request) {
  try {
    const user = await requireAuth()

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Arquivo nao enviado" }, { status: 400 })
    }

    const result = await uploadFile(file, `resumes/${user.id}`, "resume")

    // Atualizar URL do currículo no perfil
    const supabase = await createClient()
    const { error } = await supabase
      .from("profiles")
      .update({ resume_url: result.url })
      .eq("id", user.id)

    if (error) {
      console.error("[resume] DB update error:", error)
      return NextResponse.json({ error: "Erro ao salvar curriculo" }, { status: 500 })
    }

    return NextResponse.json({ url: result.url, size: result.size })
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
