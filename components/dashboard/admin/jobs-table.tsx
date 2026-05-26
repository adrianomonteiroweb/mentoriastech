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
import { AlertTriangle, CheckCircle2, Eye, MousePointerClick, Pencil, Share2, Trash2, XCircle } from "lucide-react"
import type { JobWithAuthor } from "@/lib/types/database"

interface JobWithCounts extends JobWithAuthor {
  action_counts?: { applied: number; link_issue: number; closed: number }
}

const JOB_CATEGORY_LABELS: Record<string, string> = {
  dados: "Dados",
  ia: "IA",
  desenvolvimento: "Dev",
  po: "PO",
  pm: "PM",
  qa: "QA",
  cyber_security: "Cyber Security",
  devops: "DevOps",
  design: "Design",
  pcd: "PCD",
  afirmativa_pessoas_pretas: "Afirmativa: pessoas pretas",
  afirmativa_mulheres_tecnologia: "Afirmativa: mulheres na tecnologia",
  other: "Outra",
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
    await fetch(`/api/admin/jobs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    loadJobs()
  }

  async function deleteJob(id: string) {
    if (!confirm("Remover esta vaga?")) return
    await fetch(adminMode ? `/api/admin/jobs/${id}` : `/api/jobs/${id}`, {
      method: "DELETE",
    })
    loadJobs()
  }

  function handleEditSuccess() {
    setEditingJob(null)
    loadJobs()
  }

  const visibleJobs = showAll ? jobs : jobs.filter((j) => j.status === "pending")
  const showActions = true
  const columnCount = showActions ? 11 : 10

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titulo</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Nivel</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Autor</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Cliques</TableHead>
            <TableHead>Compart.</TableHead>
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
                  <Badge variant="outline" className="text-xs capitalize">{job.job_type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {job.level === "internship" ? "Estágio" : job.level === "junior" ? "Júnior" : job.level === "mid" ? "Pleno" : "Sênior"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">
                    {job.category ? JOB_CATEGORY_LABELS[job.category] || job.category : "—"}
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
                        onClick={() => setEditingJob(job)}
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
