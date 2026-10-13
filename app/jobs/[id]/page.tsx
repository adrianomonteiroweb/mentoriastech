import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock,
  DollarSign,
  ExternalLink,
  Globe,
  Languages,
  MapPin,
} from "lucide-react"
import { ShareButton } from "@/components/share-button"
import { getPublicJob } from "@/lib/db/job-listing"
import { buildJobPostingSchema } from "@/lib/job-posting-schema"
import { getAreaFamilyLabel, getAreaSpecialtyLabel, getInclusionLabel } from "@/lib/job-areas"
import {
  JOB_TYPE_LABELS,
  getJobLevelLabel,
  getLanguageLevelLabel,
} from "@/lib/job-labels"
import { parseSummaryRows } from "@/lib/job-summary"
import { SITE_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

type Params = Promise<{ id: string }>

const JOB_TYPE_CLASSES: Record<string, string> = {
  remote: "bg-job-remote-bg text-job-remote",
  hybrid: "bg-job-hybrid-bg text-job-hybrid",
  onsite: "bg-job-onsite-bg text-job-onsite",
}

/**
 * Metadata por vaga. E o que faz a pagina valer no buscador e no preview do
 * WhatsApp — o link compartilhado deixa de ser "Portal de Vagas Tech" generico
 * e passa a dizer o cargo e a empresa.
 */
export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const { id } = await params
  const job = await getPublicJob(id)

  if (!job) {
    return { title: "Vaga não encontrada", robots: { index: false, follow: true } }
  }

  const where = job.job_type === "remote" ? "Remoto" : job.location || "Presencial"
  const title = job.company
    ? `${job.title} — ${job.company}`
    : job.title

  const description =
    job.description?.trim().slice(0, 160) ||
    `Vaga de ${job.title}${job.company ? ` na ${job.company}` : ""} · ${where} · ${getJobLevelLabel(job.level)}.`

  const url = `${SITE_URL}/jobs/${job.id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | MentoriasTech`,
      description,
      url,
      type: "article",
      locale: "pt_BR",
      siteName: "MentoriasTech",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  }
}

export const dynamic = "force-dynamic"

export default async function JobDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const job = await getPublicJob(id)

  // 404 de verdade: vaga removida ou nao aprovada nao pode responder 200 com
  // "nao encontrada", senao o Google indexa a pagina de erro.
  if (!job) notFound()

  const url = `${SITE_URL}/jobs/${job.id}`
  const summaryRows = job.summary ? parseSummaryRows(job.summary) : []
  const description = job.description?.trim() || job.description_en?.trim() || null

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-16 pt-5 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJobPostingSchema(job, url)),
        }}
      />

      <nav aria-label="Trilha de navegação" className="text-sm">
        <Link
          href="/jobs"
          className="inline-flex min-h-10 items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para o portal
        </Link>
      </nav>

      <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <header>
          <h1 className="text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
            {job.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            {job.company && (
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                {job.company}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                {job.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
              <time dateTime={job.source_posted_at}>
                {new Date(job.source_posted_at).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  timeZone: "America/Sao_Paulo",
                })}
              </time>
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                JOB_TYPE_CLASSES[job.job_type],
              )}
            >
              {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
            </span>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {getJobLevelLabel(job.level)}
            </span>
            {job.area_specialty && (
              <span className="rounded-full bg-job-area-bg px-3 py-1 text-xs font-medium text-job-area">
                {getAreaSpecialtyLabel(job.area_specialty)}
              </span>
            )}
            {job.is_international && (
              <span className="inline-flex items-center gap-1 rounded-full border border-job-international/40 bg-job-international-bg px-3 py-1 text-xs font-semibold text-job-international">
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                Internacional
              </span>
            )}
            {job.required_language && (
              <span className="inline-flex items-center gap-1 rounded-full border border-job-international/25 bg-job-international-bg px-3 py-1 text-xs font-medium text-job-international">
                <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                {job.required_language}
                {job.language_level && ` · ${getLanguageLevelLabel(job.language_level)}`}
              </span>
            )}
          </div>

          {job.inclusion_tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.inclusion_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                >
                  {getInclusionLabel(tag)}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Acao principal logo no topo E repetida na base: numa pagina longa,
            quem le ate o fim nao deve ter de rolar de volta para se candidatar. */}
        {job.application_url && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <a
              href={job.application_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:flex-none"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Ver vaga na origem
            </a>
            <ShareButton
              path={`/jobs/${job.id}`}
              title={job.company ? `${job.title} na ${job.company}` : job.title}
              text="Veja esta vaga da curadoria MentoriasTech."
              label="Compartilhar"
              variant="outline"
              size="default"
              tracking={{ type: "job", id: job.id }}
              className="min-h-12"
            />
          </div>
        )}

        {job.recommendation_note && (
          <p className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            <span className="mr-1.5 font-medium text-primary">Indicação:</span>
            {job.recommendation_note}
          </p>
        )}

        {job.stack_tags.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tecnologias
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {job.stack_tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {summaryRows.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Resumo
            </h2>
            <table className="w-full overflow-hidden rounded-xl border border-border text-sm">
              <tbody>
                {summaryRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/60 align-top last:border-0">
                    <th
                      scope="row"
                      className="w-2/5 bg-secondary/40 px-3 py-2 text-left font-medium text-foreground"
                    >
                      {row.label}
                    </th>
                    <td className="px-3 py-2 text-muted-foreground">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {job.important_note && (
          <section className="mt-5 rounded-xl border border-job-warning/20 bg-job-warning-bg px-4 py-3">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-job-warning">
              Observação importante
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {job.important_note}
            </p>
          </section>
        )}

        {description && (
          <section className="mt-5">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Descrição
            </h2>
            {/* Sem line-clamp aqui de proposito: a pagina individual existe
                justamente para mostrar a descricao INTEIRA, e o Google exige a
                descricao completa na pagina para validar o JobPosting. */}
            <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {description}
            </div>
          </section>
        )}

        {job.salary_range && (
          <p className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" aria-hidden="true" />
            {job.salary_range}
          </p>
        )}

        <footer className="mt-6 border-t border-border pt-5">
          {job.application_url && (
            <a
              href={job.application_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Ver vaga na origem
            </a>
          )}

          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Vaga da curadoria MentoriasTech. A candidatura acontece no site da
            empresa — confira os dados antes de se candidatar.
          </p>
        </footer>
      </article>

      <div className="flex flex-wrap gap-2">
        {job.area_family && (
          <Link
            href={`/jobs?family=${job.area_family}`}
            className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
          >
            Mais vagas de {getAreaFamilyLabel(job.area_family)}
          </Link>
        )}
        {job.company && (
          <Link
            href={`/jobs?company=${encodeURIComponent(job.company)}`}
            className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
          >
            Mais vagas na {job.company}
          </Link>
        )}
      </div>
    </main>
  )
}
