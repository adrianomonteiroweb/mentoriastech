import { NextResponse } from "next/server"
import { getCompanyProfile } from "@/lib/db/job-taxonomy"

// GET /api/jobs/companies/[id] — perfil publico de uma empresa contratante:
// todas as stacks que ela pede, distribuicao de nivel, localidades e as ultimas
// vagas. E o que o drawer de /jobs/insights abre, e a resposta concreta a
// "quais stacks a empresa X usa".
//
// PUBLICO: getCompanyProfile conta apenas vagas aprovadas, e devolve null para
// empresa sem nenhuma vaga aprovada — empresa que so tem vaga pendente nao pode
// ser confirmada publicamente como contratante.
export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    // Sem isto, um id malformado vira erro de cast do Postgres (500) em vez de
    // um 400 honesto.
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Id inválido" }, { status: 400 })
    }

    const profile = await getCompanyProfile(id)
    if (!profile) {
      return NextResponse.json({ error: "Empresa nao encontrada" }, { status: 404 })
    }

    return NextResponse.json(
      { data: profile },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
    )
  } catch (error) {
    console.error("[jobs/companies]", (error as Error).message)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
