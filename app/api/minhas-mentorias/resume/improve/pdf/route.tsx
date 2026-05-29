import { renderToBuffer } from "@react-pdf/renderer"
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ResumePDF } from "@/lib/pdf/resume-pdf"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  markdown: z.string().trim().min(1, "Conteúdo vazio").max(40000, "Conteúdo muito longo"),
})

export async function POST(request: Request) {
  try {
    await requireMenteeAccess()

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Dados inválidos" },
        { status: 400 },
      )
    }

    const buffer = await renderToBuffer(<ResumePDF markdown={parsed.data.markdown} />)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="curriculo-otimizado.pdf"',
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
