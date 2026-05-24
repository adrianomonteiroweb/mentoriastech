import { NextResponse } from "next/server"
import { requireRole } from "@/lib/utils/auth"
import { uploadFile, UploadError } from "@/lib/utils/upload"

export async function POST(request: Request) {
  try {
    await requireRole("admin")

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })
    }

    const result = await uploadFile(file, "ads", "ads")

    return NextResponse.json({
      url: result.url,
      size: result.size,
    })
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
