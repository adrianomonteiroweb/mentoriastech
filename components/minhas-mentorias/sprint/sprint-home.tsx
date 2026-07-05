"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { History, Loader2 } from "lucide-react"
import { MentoriasShell } from "@/components/minhas-mentorias/layout/mentorias-shell"
import { JobPostings } from "./job-postings"
import { ApplicationStatusCard } from "./application-status-card"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type {
  SimApplicationApi,
  SimSprintApi,
  SimSprintTemplateApi,
} from "@/lib/types/database"

interface Props {
  email: string
}

export function SprintHome({ email }: Props) {
  const [loading, setLoading] = useState(true)
  const [vagas, setVagas] = useState<SimSprintTemplateApi[]>([])
  const [applications, setApplications] = useState<SimApplicationApi[]>([])
  const [sprints, setSprints] = useState<SimSprintApi[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [vagasRes, appsRes, sprintsRes] = await Promise.all([
        fetch("/api/minhas-mentorias/sprints/vagas"),
        fetch("/api/minhas-mentorias/sprints/candidaturas"),
        fetch("/api/minhas-mentorias/sprints"),
      ])
      const [vagasJson, appsJson, sprintsJson] = await Promise.all([
        vagasRes.json(),
        appsRes.json(),
        sprintsRes.json(),
      ])
      setVagas(vagasJson.data || [])
      setApplications(appsJson.data || [])
      setSprints(sprintsJson.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const pendingApplication = applications.find((a) => a.status === "pending")
  const pastSprints = sprints.filter((s) => s.status !== "active")

  return (
    <MentoriasShell email={email} title="Simulador de Sprint">
      <div className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">
        <section aria-label="Sobre o simulador">
          <h2 className="text-xl font-bold text-foreground">
            Trabalhe como dev em uma empresa fictícia
          </h2>
          <p className="mt-1 text-base text-muted-foreground leading-relaxed">
            Candidate-se a uma vaga, seja aprovado pelo mentor e viva uma
            sprint de verdade: kanban, daily com o Tech Lead, documentação e
            pontuação pelo seu desempenho.
          </p>
        </section>

        {loading ? (
          <div
            className="flex items-center justify-center py-12"
            role="status"
            aria-label="Carregando"
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {pendingApplication && (
              <ApplicationStatusCard application={pendingApplication} />
            )}

            <section aria-label="Vagas abertas" className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-muted-foreground">
                Vagas abertas
              </h2>
              <JobPostings
                vagas={vagas}
                disabled={Boolean(pendingApplication)}
                onApplied={load}
              />
            </section>

            {applications.filter((a) => a.status === "rejected").length > 0 && (
              <section
                aria-label="Candidaturas anteriores"
                className="flex flex-col gap-3"
              >
                <h2 className="text-base font-semibold text-muted-foreground">
                  Candidaturas anteriores
                </h2>
                {applications
                  .filter((a) => a.status === "rejected")
                  .map((application) => (
                    <ApplicationStatusCard
                      key={application.id}
                      application={application}
                    />
                  ))}
              </section>
            )}

            {pastSprints.length > 0 && (
              <section
                aria-label="Sprints concluídas"
                className="flex flex-col gap-3"
              >
                <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                  <History className="h-4 w-4" aria-hidden="true" />
                  Sprints anteriores
                </h2>
                {pastSprints.map((sprint) => (
                  <Link
                    key={sprint.id}
                    href={`/minhas-mentorias/sprint/${sprint.id}`}
                    className="block group"
                  >
                    <Card className="transition-colors group-hover:border-primary/40">
                      <CardContent className="flex items-center justify-between gap-3 py-4 px-4">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-foreground truncate">
                            {sprint.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {sprint.company?.name} · {sprint.done_count}/
                            {sprint.task_count} tasks ·{" "}
                            {sprint.total_score ?? 0} pts
                          </p>
                        </div>
                        <Badge
                          variant={
                            sprint.status === "completed" ? "default" : "outline"
                          }
                        >
                          {sprint.status === "completed"
                            ? "Concluída"
                            : "Cancelada"}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </MentoriasShell>
  )
}
