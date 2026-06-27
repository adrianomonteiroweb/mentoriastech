"use client"

import { useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { JobForm } from "@/components/dashboard/hr/job-form"
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, Heart, MousePointerClick, Pencil, Share2, Trash2, XCircle } from "lucide-react"
import { getJobCategoryLabel } from "@/lib/job-options"
import type { JobWithAuthor } from "@/lib/types/database"

interface JobWithCounts extends JobWithAuthor {
  action_counts?: { applied: number; link_issue: number; closed: number; liked: number }
}

interface JobsTableProps {
  showAll?: boolean
  adminMode?: boolean
  refreshKey?: number
}

export function JobsTable({
  showAll = false,
  adminMode = false,
  refreshKey = 0,
}: JobsTableProps) {
  const [jobs, setJobs] = useState<JobWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [editingJob, setEditingJob] = useState<JobWithCounts | null>(null)
  const [selectedJob, setSelectedJob] = useState<JobWithCounts | null>(null)

  function loadJobs() {
    setLoading(true)
    fetch(adminMode ? "/api/admin/jobs" : "/api/jobs?mine=true")
      .then((r) => r.json())
      .then((json) => setJobs(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadJobs() }, [adminMode, refreshKey])

  async function updateStatus(id: string, status: "approved" | "rejected") {
    setSelectedJob(null)
    await fetch(`/api/admin/jobs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    loadJobs()
  }

  async function deleteJob(id: string) {
    if (!confirm("Remover esta vaga?")) return
    setSelectedJob(null)
    await fetch(adminMode ? `/api/admin/jobs/${id}` : `/api/jobs/${id}`, {
      method: "DELETE",
    })
    loadJobs()
  }

  function handleEditSuccess() {
    setEditingJob(null)
    loadJobs()
  }

  function openEdit(job: JobWithCounts) {
    setSelectedJob(null)
    setEditingJob(job)
  }

  const getJobLevelLabel = (level: JobWithCounts["level"]) =>
    level === "internship" ? "Estágio" : level === "junior" ? "Júnior" : level === "mid" ? "Pleno" : "Sênior"

  const getJobStatusLabel = (status: JobWithCounts["status"]) =>
    status === "approved" ? "Aprovada" : status === "pending" ? "Pendente" : status === "rejected" ? "Rejeitada" : "Expirada"

  const metricItems = (job: JobWithCounts) => [
    { label: "Views", value: job.view_count ?? 0, icon: Eye },
    { label: "Cliques", value: job.click_count ?? 0, icon: MousePointerClick },
    { label: "Compart.", value: job.share_count ?? 0, icon: Share2 },
    ...(adminMode ? [{ label: "Curtidas", value: job.action_counts?.liked ?? 0, icon: Heart }] : []),
  ]

  const visibleJobs = showAll ? jobs : jobs.filter((j) => j.status === "pending")
  const showActions = true
  const columnCount = 11 + (adminMode ? 1 : 0) + (showActions ? 1 : 0)

  return (
    <div className="flex flex-col gap-2">
      {!loading && (
        <p className="text-xs text-muted-foreground">
          Exibindo {visibleJobs.length} resultado{visibleJobs.length !== 1 ? "s" : ""}
        </p>
      )}
      <div className="grid gap-3 md:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border p-4">
              <Skeleton className="mb-3 h-4 w-3/4" />
              <Skeleton className="mb-4 h-3 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))
        ) : visibleJobs.length === 0 ? (
          <div className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
            {showAll ? "Nenhuma vaga cadastrada" : "Nenhuma vaga pendente"}
          </div>
        ) : (
          visibleJobs.map((job) => (
            <div
              key={job.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedJob(job)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  setSelectedJob(job)
                }
              }}
              className="rounded-md border bg-card p-4 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`Abrir ações da vaga ${job.title}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                    {job.title}
                  </h3>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {job.company || "Empresa não informada"}
                  </p>
                </div>
                <Badge
                  variant={job.status === "approved" ? "default" : "outline"}
                  className="shrink-0 text-[10px]"
                >
                  {getJobStatusLabel(job.status)}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[10px] capitalize">
                  {job.job_type}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {getJobLevelLabel(job.level)}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {job.category ? getJobCategoryLabel(job.category) : "Sem categoria"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {metricItems(job).map(({ label, value, icon: Icon }) => (
                  <span key={label} className="inline-flex items-center gap-1">
                    <Icon className="h-3 w-3" />
                    {value}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

    <div className="hidden overflow-x-auto rounded-md border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titulo</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Link</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Nivel</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Autor</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Cliques</TableHead>
            <TableHead>Compart.</TableHead>
            {adminMode && <TableHead>Curtidas</TableHead>}
            <TableHead>Status</TableHead>
            {showActions && <TableHead>Acoes</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: columnCount }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : visibleJobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="text-center text-muted-foreground py-8">
                {showAll ? "Nenhuma vaga cadastrada" : "Nenhuma vaga pendente"}
              </TableCell>
            </TableRow>
          ) : (
            visibleJobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.title}</TableCell>
                <TableCell>{job.company || "—"}</TableCell>
                <TableCell>
                  {job.application_url ? (
                    <a
                      href={job.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Abrir
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">{job.job_type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {job.level === "internship" ? "Estágio" : job.level === "junior" ? "Júnior" : job.level === "mid" ? "Pleno" : "Sênior"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {job.category ? getJobCategoryLabel(job.category) : "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{job.profiles?.full_name || "—"}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {job.view_count ?? 0}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MousePointerClick className="h-3 w-3" />
                    {job.click_count ?? 0}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Share2 className="h-3 w-3" />
                    {job.share_count ?? 0}
                  </span>
                </TableCell>
                {adminMode && (
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart className="h-3 w-3" />
                      {job.action_counts?.liked ?? 0}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge
                      variant={job.status === "approved" ? "default" : "outline"}
                      className="text-xs capitalize w-fit"
                    >
                      {job.status === "approved" ? "Aprovada" : job.status === "pending" ? "Pendente" : "Rejeitada"}
                    </Badge>
                    {adminMode && job.action_counts && (job.action_counts.link_issue > 0 || job.action_counts.closed > 0) && (
                      <div className="flex gap-1">
                        {job.action_counts.link_issue > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-500" title="Link com problemas">
                            <AlertTriangle className="h-2.5 w-2.5" /> {job.action_counts.link_issue}
                          </span>
                        )}
                        {job.action_counts.closed > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-500" title="Não aceita mais candidaturas">
                            <XCircle className="h-2.5 w-2.5" /> {job.action_counts.closed}
                          </span>
                        )}
                      </div>
                    )}
                    {adminMode && job.action_counts && job.action_counts.applied > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <CheckCircle2 className="h-2.5 w-2.5" /> {job.action_counts.applied} candidatura{job.action_counts.applied > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </TableCell>
                {showActions && (
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {adminMode && job.status === "pending" && (
                        <>
                        <Button size="sm" variant="outline" className="text-xs h-7"
                          onClick={() => updateStatus(job.id, "approved")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive"
                          onClick={() => updateStatus(job.id, "rejected")}>
                          <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                        </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => openEdit(job)}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive"
                        onClick={() => deleteJob(job.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Remover
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>

      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedJob?.title}</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="grid gap-4">
              <div className="grid gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Empresa</span>
                  <p className="font-medium">{selectedJob.company || "Não informada"}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={selectedJob.status === "approved" ? "default" : "outline"} className="text-xs">
                    {getJobStatusLabel(selectedJob.status)}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {selectedJob.job_type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getJobLevelLabel(selectedJob.level)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedJob.category ? getJobCategoryLabel(selectedJob.category) : "Sem categoria"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {metricItems(selectedJob).map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-md border p-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {label}
                      </span>
                      <p className="text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
                {selectedJob.profiles?.full_name && (
                  <div>
                    <span className="text-xs text-muted-foreground">Autor</span>
                    <p>{selectedJob.profiles.full_name}</p>
                  </div>
                )}
                {adminMode && selectedJob.action_counts && (
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.action_counts.link_issue > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-500">
                        <AlertTriangle className="h-3 w-3" />
                        {selectedJob.action_counts.link_issue} link
                      </span>
                    )}
                    {selectedJob.action_counts.closed > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500">
                        <XCircle className="h-3 w-3" />
                        {selectedJob.action_counts.closed} encerrada
                      </span>
                    )}
                    {selectedJob.action_counts.applied > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        <CheckCircle2 className="h-3 w-3" />
                        {selectedJob.action_counts.applied} candidatura{selectedJob.action_counts.applied > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                {selectedJob.application_url && (
                  <Button variant="outline" className="justify-start" asChild>
                    <a href={selectedJob.application_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir link da vaga
                    </a>
                  </Button>
                )}
                {adminMode && selectedJob.status === "pending" && (
                  <>
                    <Button variant="outline" className="justify-start" onClick={() => updateStatus(selectedJob.id, "approved")}>
                      <CheckCircle2 className="h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button variant="ghost" className="justify-start text-destructive" onClick={() => updateStatus(selectedJob.id, "rejected")}>
                      <XCircle className="h-4 w-4" />
                      Rejeitar
                    </Button>
                  </>
                )}
                <Button variant="ghost" className="justify-start" onClick={() => openEdit(selectedJob)}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button variant="ghost" className="justify-start text-destructive" onClick={() => deleteJob(selectedJob.id)}>
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingJob} onOpenChange={(open) => !open && setEditingJob(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar vaga</DialogTitle>
          </DialogHeader>
          {editingJob && (
            <JobForm
              key={editingJob.id}
              job={editingJob}
              adminMode={adminMode}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
