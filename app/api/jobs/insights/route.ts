import { NextResponse } from "next/server"
import { getJobInsights, insightsQuerySchema } from "@/lib/db/job-insights"

// GET /api/jobs/insights — agregados do painel publico de vagas.
//
// PUBLICO e sem sessao. Por isso:
//  - `status = 'approved'` e fixo dentro de lib/db/job-insights.ts. Vaga
//    pendente ou rejeitada nao vaza nem como numero agregado.
//  - nao ha nada de engajamento (view_count / click_count / share_count) nem de
//    curadoria (contagem de pendentes, cobertura de drift): isso e sinal
//    interno. Uma variante admin desses blocos e uma rota separada sob
//    app/api/admin/, reaproveitando os mesmos construtores de SQL — nao
//    parametrize a autenticacao desta aqui.
//
// AX: o mesmo agregado que a pagina renderiza fica disponivel em JSON estavel,
// com um bloco `meta` autoexplicativo, para um agente nao precisar raspar HTML.
export const dynamic = "force-dynamic"

const CACHE_CONTROL = "public, s-maxage=1800, stale-while-revalidate=3600"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const parsed = insightsQuerySchema.safeParse({
      period: searchParams.get("period") ?? undefined,
      date_field: searchParams.get("date_field") ?? undefined,
      stack: searchParams.get("stack") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      level: searchParams.get("level") ?? undefined,
      job_type: searchParams.get("job_type") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      international: searchParams.get("international") ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const insights = await getJobInsights(parsed.data)

    return NextResponse.json(
      {
        data: insights,
        meta: {
          source: "Curadoria MentoriasTech — vagas coletadas do LinkedIn e do Glassdoor",
          scope: "Somente vagas aprovadas pela curadoria.",
          generated_at: insights.generated_at,
          total_jobs: insights.kpis.total_jobs.current,
          // Ressalvas que a leitura honesta dos números exige. Vão no JSON (e
          // não só na UI) porque quem consome a API tem o mesmo direito de
          // saber onde o dado é fraco.
          caveats: [
            "O percentual das stacks é sobre MENÇÕES, não sobre vagas: uma vaga tem várias stacks, então a soma passa de 100%.",
            "Vagas sem modelo de trabalho detectado entram como 'remoto' (default da coluna). Nas rodadas remotas do bot isso é factual — o LinkedIn já filtrou por remoto —, mas nas demais é um default.",
            "Localidade e stacks vêm de parse automático da descrição da vaga: o balde 'Não informado' é o que o parse não resolveu, e não vagas sem localidade.",
            "Recortes com menos de 10 vagas são amostra pequena; leia o número absoluto, não o percentual.",
          ],
        },
      },
      { headers: { "Cache-Control": CACHE_CONTROL } },
    )
  } catch (error) {
    console.error("[jobs/insights]", (error as Error).message)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
