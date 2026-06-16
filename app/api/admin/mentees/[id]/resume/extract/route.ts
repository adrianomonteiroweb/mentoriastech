import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db, profiles } from "@/lib/db"
import { requireRole } from "@/lib/utils/auth"
import { extractPdfText } from "@/lib/utils/pdf-to-markdown"
import { isProtectedResumePath } from "@/lib/utils/resume-access"
import { getPrivateFile } from "@/lib/utils/upload"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("admin", "mentor")
    const { id } = await params

    const [mentee] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1)

    if (!mentee || mentee.role !== "mentee") {
      return NextResponse.json({ error: "Mentorado nao encontrado" }, { status: 404 })
    }

    if (!mentee.resumeUrl || !isProtectedResumePath(mentee.resumeUrl)) {
      return NextResponse.json(
        { error: "Nenhum curriculo encontrado para extrair" },
        { status: 404 },
      )
    }

    const file = await getPrivateFile(mentee.resumeUrl)
    if (!file?.stream) {
      return NextResponse.json(
        { error: "Nao foi possivel acessar o arquivo do curriculo" },
        { status: 404 },
      )
    }

    const arrayBuffer = await new Response(file.stream).arrayBuffer()
    const resumeMarkdown = await extractPdfText(arrayBuffer)

    if (!resumeMarkdown) {
      return NextResponse.json(
        { error: "Nao foi possivel extrair texto do PDF. O arquivo pode ser uma imagem escaneada." },
        { status: 422 },
      )
    }

    await db
      .update(profiles)
      .set({ resumeMarkdown, updatedAt: new Date() })
      .where(eq(profiles.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
