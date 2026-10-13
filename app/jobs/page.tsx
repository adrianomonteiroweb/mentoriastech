import type { Metadata } from "next"
import { cookies } from "next/headers"
import { and, eq, inArray, or } from "drizzle-orm"
import { db, jobActions } from "@/lib/db"
import { getJobFacets, listJobs } from "@/lib/db/job-listing"
import { parseJobListQuery } from "@/lib/job-list-query"
import {
  JOB_LIKE_VISITOR_COOKIE,
  resolveJobLikeVisitor,
} from "@/lib/job-like-visitor"
import { getSession } from "@/lib/utils/auth"
import { SITE_URL } from "@/lib/site"
import { JobsPortal } from "@/components/jobs/portal/jobs-portal"
import { JobSkeletonList } from "@/components/jobs/portal/job-skeleton"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Portal de Vagas Tech — Vagas em Tecnologia",
  description:
    "Portal de vagas tech curadas todos os dias pela comunidade MentoriasTech. Vagas remotas, internacionais, júnior, pleno, sênior e estágio em tecnologia.",
  keywords: [
    "vagas tech", "vagas em tecnologia", "vagas remotas", "vagas internacionais",
    "vagas junior tecnologia", "vagas pleno", "vagas senior", "vagas estagio tecnologia",
    "vagas desenvolvedor", "vagas UX design", "vagas QA", "vagas product owner",
    "vagas dados", "vagas devops", "vagas SRE", "vagas scrum master",
  ],
  openGraph: {
    title: "Portal de Vagas Tech — MentoriasTech",
    description:
      "Vagas tech curadas todos os dias. Remotas, internacionais, de estágio a principal, em todas as áreas da tecnologia.",
    type: "website",
    url: `${SITE_URL}/jobs`,
    locale: "pt_BR",
    siteName: "MentoriasTech",
  },
  alternates: { canonical: `${SITE_URL}/jobs` },
  robots: { index: true, follow: true },
}

// A busca vive na URL, entao cada combinacao de filtro e uma pagina propria.
export const dynamic = "force-dynamic"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * Portal de vagas.
 *
 * Server component de proposito: a PRIMEIRA pagina ja vai no HTML, filtrada.
 * Antes a pagina era um componente de cliente que montava vazio, baixava a
 * lista inteira e so entao pintava — em 4G, segundos de tela em branco, e nada
 * de conteudo para o Google indexar. Agora o cliente so assume dali para
 * frente (rolagem, curtida, match).
 */
export default async function JobsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const raw = await searchParams

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(key, item)
    }
  }

  const query = parseJobListQuery(params)

  // Lista e facetas em paralelo: a contagem do filtro nao pode esperar a lista.
  const [listing, facets, session] = await Promise.all([
    listJobs(query),
    getJobFacets(query),
    getSession().catch(() => null),
  ])

  // Acoes so das vagas desta pagina.
  let initialActions: { job_id: string; action_type: string }[] = []
  if (listing.data.length > 0) {
    const cookieStore = await cookies()
    const visitor = resolveJobLikeVisitor(
      cookieStore.get(JOB_LIKE_VISITOR_COOKIE)?.value,
    )

    const rows = await db
      .select({ jobId: jobActions.jobId, actionType: jobActions.actionType })
      .from(jobActions)
      .where(
        and(
          inArray(
            jobActions.jobId,
            listing.data.map((job) => job.id),
          ),
          session
            ? or(
                eq(jobActions.userId, session.id),
                eq(jobActions.visitorHash, visitor.hash),
              )
            : and(
                eq(jobActions.visitorHash, visitor.hash),
                eq(jobActions.actionType, "liked"),
              ),
        ),
      )

    initialActions = Array.from(
      new Map(
        rows.map((row) => [
          `${row.jobId}:${row.actionType}`,
          { job_id: row.jobId, action_type: row.actionType },
        ]),
      ).values(),
    )
  }

  const searchQS = params.toString()

  // key: remonta o cliente quando a BUSCA muda, zerando as paginas acumuladas.
  // Sem isso, trocar de filtro deixaria as vagas do filtro anterior na tela.
  const resetKey = (() => {
    const k = new URLSearchParams(searchQS)
    k.delete("cursor")
    k.sort()
    return k.toString()
  })()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Portal de Vagas Tech — MentoriasTech",
            description:
              "Vagas tech curadas diariamente: remotas, internacionais, de estágio a principal, em todas as áreas da tecnologia.",
            url: `${SITE_URL}/jobs`,
            inLanguage: "pt-BR",
            isPartOf: {
              "@type": "WebSite",
              name: "MentoriasTech",
              url: SITE_URL,
            },
          }),
        }}
      />
      <Suspense fallback={<JobSkeletonList />}>
        <JobsPortal
          key={resetKey}
          query={query}
          facets={facets}
          initialJobs={listing.data}
          initialCursor={listing.next_cursor}
          initialActions={initialActions}
          isAuthenticated={!!session}
          resolvedSort={listing.sort}
          searchQS={searchQS}
        />
      </Suspense>
    </>
  )
}
