import type { Metadata } from "next"
import Link from "next/link"
import { Briefcase } from "lucide-react"
import { getJobInsights, insightsQuerySchema } from "@/lib/db/job-insights"
import { SITE_URL } from "@/lib/site"
import { ChartCard } from "@/components/jobs/insights/chart-card"
import { CompaniesPanel } from "@/components/jobs/insights/companies-panel"
import {
  ActiveFilters,
  PeriodChips,
  type ActiveFilter,
} from "@/components/jobs/insights/filter-chips"
import {
  formatDateTime,
  formatNumber,
  isSmallSample,
  PERIOD_LABELS,
} from "@/components/jobs/insights/format"
import { KpiRow } from "@/components/jobs/insights/kpi-row"
import { LevelBars } from "@/components/jobs/insights/level-bars"
import { RankBars } from "@/components/jobs/insights/rank-bars"
import { TimeseriesChart } from "@/components/jobs/insights/timeseries-chart"
import { WorkModelBar } from "@/components/jobs/insights/work-model-bar"

// Esta página lê `searchParams` (o recorte vive na URL), o que a torna DINÂMICA
// no App Router — um `export const revalidate` aqui NÃO impediria cada visita de
// chegar no banco, e a página é pública. O cache de verdade está em
// getJobInsights (unstable_cache, 30 min, chaveado por combinação de filtros):
// o recorte padrão, que é o que quase todo mundo abre, custa uma ida ao banco a
// cada meia hora em vez de nove queries agregadas por visitante.

export const metadata: Metadata = {
  title: "Radar de Vagas Tech — Stacks, Modelos de Trabalho e Localidades",
  description:
    "Indicadores do mercado de tecnologia a partir das vagas curadas pela MentoriasTech: principais stacks, modelos de trabalho (remoto, híbrido, presencial), localidades, níveis e empresas que mais contratam.",
  keywords: [
    "mercado de trabalho tech",
    "stacks mais pedidas",
    "vagas remotas estatísticas",
    "linguagens mais requisitadas",
    "vagas tech por nível",
    "empresas que contratam tech",
    "vagas internacionais tecnologia",
    "dados vagas tecnologia brasil",
  ],
  openGraph: {
    title: "Radar de Vagas Tech — MentoriasTech",
    description:
      "O que o mercado tech está pedindo: stacks, modelos de trabalho, localidades e níveis, a partir das vagas curadas todos os dias.",
    type: "website",
    url: `${SITE_URL}/jobs/insights`,
    locale: "pt_BR",
    siteName: "MentoriasTech",
  },
  twitter: {
    card: "summary_large_image",
    title: "Radar de Vagas Tech — MentoriasTech",
    description:
      "Stacks, modelos de trabalho, localidades e níveis das vagas tech curadas pela comunidade.",
  },
  alternates: { canonical: `${SITE_URL}/jobs/insights` },
  robots: { index: true, follow: true },
}

const PERIODS = ["7d", "30d", "90d", "12m", "all"] as const

type SearchParams = Record<string, string | string[] | undefined>

function firstValue(params: SearchParams, key: string): string | undefined {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

/** Constrói uma URL preservando os filtros atuais e mudando/limpando um deles. */
function buildHref(params: SearchParams, changes: Record<string, string | null>) {
  const next = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const single = Array.isArray(value) ? value[0] : value
    if (single) next.set(key, single)
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) next.delete(key)
    else next.set(key, value)
  }
  const query = next.toString()
  return query ? `/jobs/insights?${query}` : "/jobs/insights"
}

export default async function JobsInsightsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  const parsed = insightsQuerySchema.safeParse({
    period: firstValue(params, "period"),
    date_field: firstValue(params, "date_field"),
    stack: firstValue(params, "stack"),
    country: firstValue(params, "country"),
    level: firstValue(params, "level"),
    job_type: firstValue(params, "job_type"),
    category: firstValue(params, "category"),
    international: firstValue(params, "international"),
  })

  // Parâmetro inválido na URL não pode derrubar uma página pública: cai no
  // recorte padrão.
  const query = parsed.success ? parsed.data : insightsQuerySchema.parse({})
  const data = await getJobInsights(query)

  const total = data.kpis.total_jobs.current
  const geo = firstValue(params, "geo") === "world" ? "world" : "br"
  const expand = firstValue(params, "expand")
  const periodLabel = PERIOD_LABELS[query.period] ?? query.period
  const comparisonLabel =
    query.period === "all" ? "período anterior" : `${periodLabel} anteriores`

  const activeFilters: ActiveFilter[] = []
  if (query.stack) {
    activeFilters.push({
      label: "Stack",
      value: data.top_stacks.find((s) => s.key === query.stack)?.label ?? query.stack,
      clearHref: buildHref(params, { stack: null }),
    })
  }
  if (query.country) {
    activeFilters.push({
      label: "País",
      value:
        data.top_countries.find((c) => c.country_code === query.country)?.label ??
        query.country,
      clearHref: buildHref(params, { country: null }),
    })
  }
  if (query.level) {
    activeFilters.push({
      label: "Nível",
      value: data.levels.find((l) => l.key === query.level)?.label ?? query.level,
      clearHref: buildHref(params, { level: null }),
    })
  }
  if (query.job_type) {
    activeFilters.push({
      label: "Modelo",
      value:
        data.work_model.find((w) => w.key === query.job_type)?.label ?? query.job_type,
      clearHref: buildHref(params, { job_type: null }),
    })
  }

  const brCities = data.top_cities.filter((city) => city.country_code === "BR")
  const worldCountries = data.top_countries.filter(
    (country) => country.country_code !== "BR",
  )

  const leadStack = data.top_stacks[0]
  const leadWorkModel = data.work_model[0]
  const leadLevel = [...data.levels].sort((a, b) => b.count - a.count)[0]

  // JSON-LD Dataset: é o que faz um agente/LLM entender que esta página é um
  // conjunto de dados e onde está a versão em JSON, sem precisar raspar o HTML.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Radar de Vagas Tech — MentoriasTech",
    description:
      "Indicadores agregados das vagas de tecnologia curadas pela MentoriasTech: stacks mais pedidas, modelos de trabalho, localidades, níveis e empresas contratantes.",
    url: `${SITE_URL}/jobs/insights`,
    creator: { "@type": "Organization", name: "MentoriasTech", url: SITE_URL },
    temporalCoverage: `${data.period.from}/${data.period.to}`,
    dateModified: data.generated_at,
    isAccessibleForFree: true,
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${SITE_URL}/api/jobs/insights`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 space-y-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Radar de vagas tech
          </h1>

          {/* O escopo vem ANTES de qualquer número, em texto. Sem isso o leitor
              lê "principais stacks" como "o mercado inteiro" — é a generalização
              apressada, o viés mais provável nesta página. */}
          <p className="max-w-3xl text-sm text-muted-foreground">
            {total > 0 ? (
              <>
                <strong className="text-foreground">{formatNumber(total)} vagas</strong>{" "}
                aprovadas pela curadoria da MentoriasTech, coletadas do LinkedIn e do
                Glassdoor nos últimos <strong>{periodLabel.toLowerCase()}</strong>. Não é
                o mercado inteiro — é o recorte que a nossa curadoria alcança, e os
                números devem ser lidos assim.
              </>
            ) : (
              <>
                Ainda não há vagas aprovadas neste recorte. Experimente um período maior
                ou limpe os filtros.
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <PeriodChips
              options={PERIODS.map((period) => ({
                value: period,
                label: PERIOD_LABELS[period],
                href: buildHref(params, { period, expand: null }),
                active: query.period === period,
              }))}
            />
            <p className="text-xs text-muted-foreground">
              Atualizado em {formatDateTime(data.generated_at)}
            </p>
          </div>

          <ActiveFilters filters={activeFilters} />
        </header>

        <section aria-label="Indicadores principais" className="mb-6">
          <KpiRow
            kpis={[
              {
                label: "Vagas no período",
                value: formatNumber(total),
                delta: data.kpis.total_jobs.delta_pct,
                comparisonLabel,
              },
              {
                label: "Empresas contratando",
                value: formatNumber(data.kpis.companies.current),
                delta: data.kpis.companies.delta_pct,
                comparisonLabel,
              },
              {
                label: "Remoto",
                value: isSmallSample(total)
                  ? formatNumber(data.kpis.remote.current)
                  : `${data.kpis.remote.share_pct.toLocaleString("pt-BR")}%`,
                context: `${formatNumber(data.kpis.remote.current)} de ${formatNumber(total)}`,
                delta: data.kpis.remote.delta_pct,
                comparisonLabel,
              },
              {
                label: "Internacionais",
                value: isSmallSample(total)
                  ? formatNumber(data.kpis.international.current)
                  : `${data.kpis.international.share_pct.toLocaleString("pt-BR")}%`,
                context: `${formatNumber(data.kpis.international.current)} de ${formatNumber(total)}`,
                delta: data.kpis.international.delta_pct,
                comparisonLabel,
              },
              {
                label: "Stack nº 1",
                value: data.kpis.top_stack?.label ?? "—",
                context: data.kpis.top_stack
                  ? `${formatNumber(data.kpis.top_stack.count)} menções`
                  : "sem stacks identificadas",
                delta: null,
                comparisonLabel,
              },
            ]}
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Principais stacks"
            summary={
              leadStack
                ? `${leadStack.label} lidera com ${formatNumber(leadStack.count)} menções, ${leadStack.share_pct.toLocaleString("pt-BR")}% do total de menções no período.`
                : undefined
            }
            caveat="O percentual é sobre menções, não sobre vagas: uma vaga costuma pedir várias stacks, então a soma passa de 100%. Clique numa stack para filtrar a página inteira."
            isEmpty={data.top_stacks.length === 0}
            emptyMessage="Nenhuma stack foi identificada nas descrições das vagas deste período."
            tableHeaders={["Stack", "Menções"]}
            tableRows={data.top_stacks.map((stack) => [
              stack.label,
              `${formatNumber(stack.count)} (${stack.share_pct.toLocaleString("pt-BR")}%)`,
            ])}
          >
            <RankBars
              items={data.top_stacks.map((stack) => ({
                key: stack.key,
                label: stack.label,
                count: stack.count,
                href: buildHref(params, {
                  stack: query.stack === stack.key ? null : stack.key,
                }),
                active: query.stack === stack.key,
              }))}
              total={data.stack_mentions_total}
              expanded={expand === "stacks"}
              showAllHref={buildHref(params, { expand: "stacks" })}
            />
          </ChartCard>

          <ChartCard
            title="Modelo de trabalho"
            summary={
              leadWorkModel
                ? `${leadWorkModel.label} responde por ${leadWorkModel.share_pct.toLocaleString("pt-BR")}% das vagas (${formatNumber(leadWorkModel.count)} de ${formatNumber(total)}).`
                : undefined
            }
            caveat="Vaga sem modelo identificado na descrição entra como remoto, que é o padrão do cadastro. Nas buscas remotas do nosso bot isso é factual — o próprio LinkedIn já filtrou por remoto —, mas nas demais é um valor assumido. Leia este bloco como piso do remoto, não como medida exata."
            isEmpty={total === 0}
            tableHeaders={["Modelo", "Vagas"]}
            tableRows={data.work_model.map((slice) => [
              slice.label,
              `${formatNumber(slice.count)} (${slice.share_pct.toLocaleString("pt-BR")}%)`,
            ])}
          >
            <WorkModelBar slices={data.work_model} total={total} />
          </ChartCard>

          <ChartCard
            title="Níveis"
            summary={
              leadLevel && leadLevel.count > 0
                ? `A maior concentração está em ${leadLevel.label.toLowerCase()}, com ${formatNumber(leadLevel.count)} vagas.`
                : undefined
            }
            caveat="As barras seguem a ordem da senioridade, e não a de tamanho: o que importa aqui é o formato da curva — onde o mercado abre e onde ele fecha."
            isEmpty={total === 0}
            tableHeaders={["Nível", "Vagas"]}
            tableRows={data.levels.map((level) => [
              level.label,
              `${formatNumber(level.count)} (${level.share_pct.toLocaleString("pt-BR")}%)`,
            ])}
          >
            <LevelBars levels={data.levels} total={total} />
          </ChartCard>

          <ChartCard
            title="Localidades"
            summary={
              geo === "br"
                ? "Cidades brasileiras com mais vagas no período."
                : "Países com mais vagas fora do Brasil no período."
            }
            caveat="Brasil e exterior aparecem separados de propósito: num ranking único o volume brasileiro esconderia o dado internacional, que costuma ser o que se está procurando. O balde “Não informado” é o que o parse automático da localidade não conseguiu resolver."
            isEmpty={geo === "br" ? brCities.length === 0 : worldCountries.length === 0}
            emptyMessage={
              geo === "br"
                ? "Nenhuma cidade brasileira identificada neste período."
                : "Nenhuma vaga internacional com país identificado neste período."
            }
            tableHeaders={[geo === "br" ? "Cidade" : "País", "Vagas"]}
            tableRows={(geo === "br" ? brCities : worldCountries).map((item) => [
              item.region ? `${item.label} (${item.region})` : item.label,
              formatNumber(item.count),
            ])}
          >
            <div className="space-y-3">
              <nav aria-label="Recorte geográfico" className="flex gap-1.5">
                {[
                  { key: "br", label: "Brasil" },
                  { key: "world", label: "Internacional" },
                ].map((option) => (
                  <Link
                    key={option.key}
                    href={buildHref(params, { geo: option.key })}
                    aria-current={geo === option.key ? "true" : undefined}
                    className={`rounded-full border px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      geo === option.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {option.label}
                  </Link>
                ))}
              </nav>

              <RankBars
                items={(geo === "br" ? brCities : worldCountries).map((item) => ({
                  key: item.key,
                  label: item.label,
                  hint: item.region,
                  count: item.count,
                  href:
                    geo === "world" && item.country_code
                      ? buildHref(params, {
                          country:
                            query.country === item.country_code
                              ? null
                              : item.country_code,
                        })
                      : undefined,
                  active: query.country === item.country_code,
                }))}
                total={total}
                limit={8}
              />
            </div>
          </ChartCard>

          <ChartCard
            title="Empresas que mais contratam"
            summary="Clique numa empresa para ver todas as stacks que ela pede, os níveis e as localidades."
            caveat="O ranking respeita o período selecionado; o perfil que abre ao clicar mostra o histórico completo da empresa."
            isEmpty={data.top_companies.length === 0}
            emptyMessage="Nenhuma vaga do período tem empresa identificada."
            tableHeaders={["Empresa", "Vagas"]}
            tableRows={data.top_companies.map((company) => [
              company.name,
              formatNumber(company.job_count),
            ])}
          >
            <CompaniesPanel companies={data.top_companies} />
          </ChartCard>

          <ChartCard
            title="Evolução no tempo"
            summary={`Vagas aprovadas por ${data.period.bucket === "day" ? "dia" : data.period.bucket === "week" ? "semana" : "mês"}, no fuso de São Paulo.`}
            caveat="A faixa sombreada à direita é o período ainda em curso, portanto incompleto — não leia aquela queda como tendência. O eixo vertical começa em zero."
            isEmpty={data.time_series.length < 2}
            tableHeaders={["Data", "Vagas (internacionais)"]}
            tableRows={data.time_series.map((point) => [
              point.date.split("-").reverse().join("/"),
              `${formatNumber(point.total)} (${formatNumber(point.international)})`,
            ])}
          >
            <TimeseriesChart points={data.time_series} />
          </ChartCard>
        </div>

        <section className="mt-8 rounded-lg border border-border bg-muted/30 p-4">
          <h2 className="mb-2 text-sm font-semibold">Como ler estes números</h2>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>
              São vagas <strong>aprovadas pela curadoria</strong> da MentoriasTech — um
              recorte do mercado, não o mercado inteiro.
            </li>
            <li>
              Stacks, localidade e modelo de trabalho vêm de leitura automática da
              descrição de cada vaga. O que o parser não resolveu aparece como “Não
              informado”, e não some da conta.
            </li>
            <li>
              Recortes com menos de 10 vagas mostram só a contagem: percentual de amostra
              pequena engana mais do que informa.
            </li>
            <li>
              Os mesmos dados em JSON:{" "}
              <a
                href="/api/jobs/insights"
                className="text-primary underline-offset-4 hover:underline"
              >
                /api/jobs/insights
              </a>
              .
            </li>
          </ul>

          <Link
            href="/jobs"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
          >
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            Ver as vagas abertas
          </Link>
        </section>
      </main>
    </>
  )
}
