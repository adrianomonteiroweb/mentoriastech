import { NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/utils/auth"
import { db, companyFeedbacks } from "@/lib/db"

const feedbackSchema = z.object({
  company: z.string().min(1).max(200),
  category: z.enum(["salario_baixo", "processo_longo", "nao_confiavel", "processos_inexistentes", "outro"]),
  comment: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Autenticação necessária" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = feedbackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const { company, category, comment } = parsed.data

    await db.insert(companyFeedbacks).values({
      company,
      category,
      comment: comment || null,
      profileId: session.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[company-feedback] Error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
