import { NextResponse } from "next/server"
import { getReferencia } from "@/lib/db/formacao"
import { requireFormacaoInstrutor, formacaoErrorResponse } from "@/lib/formacao/auth"

export async function GET() {
  try {
    await requireFormacaoInstrutor()
    const referencia = await getReferencia()
    return NextResponse.json({ data: referencia })
  } catch (error) {
    const { message, status } = formacaoErrorResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
