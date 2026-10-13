// Esqueleto com a FORMA do card real (titulo, meta, selos, descricao, acoes).
//
// Antes a pagina mostrava um spinner centralizado em tela cheia e, quando as
// vagas chegavam, o layout inteiro aparecia de uma vez e empurrava tudo. Em 4G
// isso e varios segundos de tela instavel. O esqueleto reserva o espaco certo,
// entao a lista nao "pula" ao carregar.
export function JobSkeleton() {
  return (
    <div
      className="animate-pulse rounded-2xl border border-border bg-card p-4 sm:p-5"
      aria-hidden="true"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="flex gap-3">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <div className="h-6 w-16 rounded-full bg-muted" />
          <div className="h-6 w-14 rounded-full bg-muted" />
        </div>
      </div>

      <div className="mb-3 flex gap-1.5">
        <div className="h-5 w-14 rounded-full bg-muted" />
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="h-5 w-12 rounded-full bg-muted" />
      </div>

      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="h-9 w-16 rounded-full bg-muted" />
        <div className="h-10 w-28 rounded-xl bg-muted" />
      </div>
    </div>
  )
}

export function JobSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Carregando vagas">
      {Array.from({ length: count }, (_, i) => (
        <JobSkeleton key={i} />
      ))}
      <span className="sr-only">Carregando vagas…</span>
    </div>
  )
}
