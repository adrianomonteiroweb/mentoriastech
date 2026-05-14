"use client"

import { useEffect, useState } from "react"
import {
  Briefcase,
  MapPin,
  Building2,
  Loader2,
  ArrowLeft,
  ExternalLink,
  DollarSign,
} from "lucide-react"
import Link from "next/link"

interface Job {
  id: string
  title: string
  company: string
  description: string
  location: string | null
  job_type: "remote" | "hybrid" | "onsite"
  salary_range: string | null
  application_url: string | null
  created_at: string
  profiles: { full_name: string } | null
}

const JOB_TYPE_LABELS: Record<string, string> = {
  remote: "Remoto",
  hybrid: "Hibrido",
  onsite: "Presencial",
}

const JOB_TYPE_COLORS: Record<string, string> = {
  remote: "bg-green-500/10 text-green-400",
  hybrid: "bg-yellow-500/10 text-yellow-400",
  onsite: "bg-blue-500/10 text-blue-400",
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error)
        } else {
          setJobs(json.data || [])
        }
      })
      .catch(() => setError("Erro ao carregar vagas"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="text-sm text-destructive">{error}</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12 md:py-20">
      <div className="w-full max-w-lg flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            Quadro de Vagas
          </h1>
          <p className="text-sm text-muted-foreground">
            Vagas compartilhadas pela comunidade de mentorados.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">
                    {job.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {job.company}
                    </span>
                    {job.location && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${JOB_TYPE_COLORS[job.job_type] || ""}`}
                >
                  {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                </span>
              </div>

              <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
                {job.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {job.salary_range && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      {job.salary_range}
                    </span>
                  )}
                </div>

                {job.application_url && (
                  <a
                    href={job.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Candidatar-se
                  </a>
                )}
              </div>

              {job.profiles?.full_name && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Publicado por {job.profiles.full_name}
                </p>
              )}
            </div>
          ))}

          {jobs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma vaga disponivel no momento.
            </p>
          )}
        </div>

      </div>
    </main>
  )
}
