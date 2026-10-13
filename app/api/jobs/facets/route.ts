import { NextResponse } from "next/server"
import { getJobFacets, parseJobListQuery } from "@/lib/db/job-listing"

// GET /api/jobs/facets — contagem por opcao de filtro, respeitando os demais
// filtros ativos.
//
// Para que serve: hoje a pessoa aplica um filtro e so entao descobre que deu
// zero resultado. Com estas contagens o filtro diz ANTES o que cada escolha
// produz ("Ver 243 vagas") e as opcoes vazias podem ser desabilitadas em vez de
// virarem beco sem saida.
//
// Aceita exatamente os mesmos parametros de GET /api/jobs (menos cursor/limit,
// que sao ignorados), entao o cliente pode mandar a mesma query string.
//
// Cache curto de propositio: a base recebe vagas o dia inteiro e uma contagem
// velha demais quebra a confianca no numero que o botao promete.
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const facets = await getJobFacets(parseJobListQuery(searchParams))

    return NextResponse.json(
      { data: facets },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    )
  } catch (error) {
    console.error("[jobs/facets] Error:", error)
    return NextResponse.json(
      { error: "Erro ao carregar os filtros" },
      { status: 500 },
    )
  }
}
