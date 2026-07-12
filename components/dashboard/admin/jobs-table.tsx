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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, Heart, Info, MousePointerClick, Pencil, Percent, Share2, Trash2, XCircle } from "lucide-react"
import { getJobCategoryLabel, mergeJobCategoryOptions } from "@/lib/job-options"
import { getJobSource, JOB_SOURCE_LABELS, type JobSource } from "@/lib/job-source"
import type { JobLevel, JobStatus, JobWithAuthor } from "@/lib/types/database"

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
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all")
  const [companyFilter, setCompanyFilter] = useState<string>("all")
  const [levelFilter, setLevelFilter] = useState<"all" | JobLevel>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<"all" | JobSource>("all")
  const [regionFilter, setRegionFilter] = useState<"all" | "brazil" | "international">("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleteSelectedOpen, setBulkDeleteSelectedOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

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

  async function bulkDeleteByStatus() {
    if (statusFilter === "all") return
    setBulkDeleting(true)
    try {
      await fetch("/api/admin/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusFilter }),
      })
      setBulkDeleteOpen(false)
      loadJobs()
    } catch (error) {
      console.error(error)
    } finally {
      setBulkDeleting(false)
    }
  }

  async function bulkDeleteSelected() {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      await fetch("/api/admin/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      setBulkDeleteSelectedOpen(false)
      setSelectedIds(new Set())
      loadJobs()
    } catch (error) {
      console.error(error)
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleEditSuccess() {
    setEditingJob(null)
    loadJobs()
  }

  function openEdit(job: JobWithCounts) {
    setSelectedJob(null)
    setEditingJob(job)
  }

  const levelLabels: Record<string, string> = {
    internship: "Estágio", junior: "Júnior", mid: "Pleno", senior: "Sênior",
    staff: "Staff", senior_staff: "Senior Staff", principal: "Principal", distinguished: "Distinguished",
  }
  const getJobLevelLabel = (level: JobWithCounts["level"]) => levelLabels[level] || level

  const getJobStatusLabel = (status: JobWithCounts["status"]) =>
    status === "approved" ? "Aprovada" : status === "pending" ? "Pendente" : status === "rejected" ? "Rejeitada" : "Expirada"

  const conversionRate = (job: JobWithCounts) => {
    const views = job.view_count ?? 0
    const clicks = job.click_count ?? 0
    return views > 0 ? Math.round((clicks / views) * 100) : 0
  }

  const metricItems = (job: JobWithCounts) => [
    { label: "Views", value: String(job.view_count ?? 0), icon: Eye },
    { label: "Cliques", value: String(job.click_count ?? 0), icon: MousePointerClick },
    { label: "Conversão", value: `${conversionRate(job)}%`, icon: Percent },
    { label: "Compart.", value: String(job.share_count ?? 0), icon: Share2 },
    ...(adminMode ? [{ label: "Curtidas", value: String(job.action_counts?.liked ?? 0), icon: Heart }] : []),
  ]

  const showControls = adminMode && showAll
  const visibleJobs = showAll
    ? jobs.filter((j) => {
        if (statusFilter !== "all" && j.status !== statusFilter) return false
        if (companyFilter !== "all" && (j.company || "") !== companyFilter)
          return false
        if (levelFilter !== "all" && j.level !== levelFilter) return false
        if (categoryFilter !== "all" && j.category !== categoryFilter)
          return false
        if (sourceFilter !== "all" && getJobSource(j.application_url) !== sourceFilter)
          return false
        if (regionFilter !== "all") {
          const isInternational = regionFilter === "international"
          if (j.is_international !== isInternational) return false
        }
        return true
      })
    : jobs.filter((j) => j.status === "pending")
  const showActions = true
  const columnCount =
    (showControls ? 1 : 0) + 13 + (adminMode ? 1 : 0) + (showActions ? 1 : 0)

  const statusOptions: { value: "all" | JobStatus; label: string }[] = [
    { value: "all", label: "Todos os status" },
    { value: "pending", label: "Pendente" },
    { value: "approved", label: "Aprovada" },
    { value: "rejected", label: "Rejeitada" },
    { value: "expired", label: "Expirada" },
  ]
  const statusCount = (status: "all" | JobStatus) =>
    status === "all" ? jobs.length : jobs.filter((j) => j.status === status).length
  const bulkDeletableCount = statusFilter === "all" ? 0 : statusCount(statusFilter)

  const companyOptions = Array.from(
    new Set(jobs.map((j) => j.company).filter((c): c is string => !!c)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"))
  const levelOptions: { value: "all" | JobLevel; label: string }[] = [
    { value: "all", label: "Todos os níveis" },
    { value: "internship", label: "Estágio" },
    { value: "junior", label: "Júnior" },
    { value: "mid", label: "Pleno" },
    { value: "senior", label: "Sênior" },
    { value: "staff", label: "Staff" },
    { value: "senior_staff", label: "Senior Staff" },
    { value: "principal", label: "Principal" },
    { value: "distinguished", label: "Distinguished" },
  ]
  const categoryOptions = mergeJobCategoryOptions(jobs.map((j) => j.category))
  const sourceOptions: { value: "all" | JobSource; label: string }[] = [
    { value: "all", label: "Todas as origens" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "glassdoor", label: "Glassdoor" },
    { value: "other", label: "Outro" },
  ]
  const regionOptions: { value: "all" | "brazil" | "international"; label: string }[] = [
    { value: "all", label: "Todas as regiões" },
    { value: "brazil", label: "Brasil" },
    { value: "international", label: "Internacional" },
  ]

  // Mantém selecionadas apenas as vagas ainda visíveis no filtro atual.
  useEffect(() => {
    setSelectedIds((prev) => {
      const visibleIds = new Set(visibleJobs.map((j) => j.id))
      let changed = false
      const next = new Set<string>()
      prev.forEach((id) => {
        if (visibleIds.has(id)) next.add(id)
        else changed = true
      })
      return changed ? next : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, companyFilter, levelFilter, categoryFilter, sourceFilter, regionFilter, jobs])

  const allVisibleSelected =
    visibleJobs.length > 0 && visibleJobs.every((j) => selectedIds.has(j.id))
  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (visibleJobs.every((j) => prev.has(j.id))) {
        const next = new Set(prev)
        visibleJobs.forEach((j) => next.delete(j.id))
        return next
      }
      const next = new Set(prev)
      visibleJobs.forEach((j) => next.add(j.id))
      return next
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {showControls && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as "all" | JobStatus)}
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} ({statusCount(option.value)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="h-8 w-full text-xs sm:w-44">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companyOptions.map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={levelFilter}
              onValueChange={(value) => setLevelFilter(value as "all" | JobLevel)}
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-40">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                {levelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-full text-xs sm:w-44">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sourceFilter}
              onValueChange={(value) => setSourceFilter(value as "all" | JobSource)}
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-40">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={regionFilter}
              onValueChange={(value) => setRegionFilter(value as "all" | "brazil" | "international")}
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-40">
                <SelectValue placeholder="Região" />
              </SelectTrigger>
              <SelectContent>
                {regionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs"
              disabled={selectedIds.size === 0}
              onClick={() => setBulkDeleteSelectedOpen(true)}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Excluir selecionadas{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              disabled={statusFilter === "all" || bulkDeletableCount === 0}
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Excluir todos por status{statusFilter !== "all" ? ` (${bulkDeletableCount})` : ""}
            </Button>
          </div>
        </div>
      )}
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
                {showControls && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="pt-0.5"
                  >
                    <Checkbox
                      checked={selectedIds.has(job.id)}
                      onCheckedChange={() => toggleSelected(job.id)}
                      aria-label={`Selecionar ${job.title}`}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
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
                <Badge variant="outline" className="text-[10px]">
                  {JOB_SOURCE_LABELS[getJobSource(job.application_url)]}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {job.is_international ? "Internacional" : "Brasil"}
                </Badge>
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
            {showControls && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Selecionar todas as vagas visíveis"
                />
              </TableHead>
            )}
            <TableHead>Titulo</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead className="hidden lg:table-cell">Link</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Região</TableHead>
            <TableHead className="hidden lg:table-cell">Tipo</TableHead>
            <TableHead className="hidden lg:table-cell">Nivel</TableHead>
            <TableHead className="hidden xl:table-cell">Categoria</TableHead>
            <TableHead className="hidden xl:table-cell">Autor</TableHead>
            <TableHead className="hidden 2xl:table-cell">Views</TableHead>
            <TableHead className="hidden 2xl:table-cell">Cliques</TableHead>
            <TableHead className="hidden 2xl:table-cell">Compart.</TableHead>
            {adminMode && <TableHead className="hidden 2xl:table-cell">Curtidas</TableHead>}
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
              <TableRow key={job.id} data-state={selectedIds.has(job.id) ? "selected" : undefined}>
                {showControls && (
                  <TableCell className="w-10">
                    <Checkbox
                      checked={selectedIds.has(job.id)}
                      onCheckedChange={() => toggleSelected(job.id)}
                      aria-label={`Selecionar ${job.title}`}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{job.title}</TableCell>
                <TableCell>{job.company || "—"}</TableCell>
                <TableCell className="hidden lg:table-cell">
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
                  <Badge variant="outline" className="text-xs">
                    {JOB_SOURCE_LABELS[getJobSource(job.application_url)]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {job.is_international ? "Internacional" : "Brasil"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant="outline" className="text-xs capitalize">{job.job_type}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant="outline" className="text-xs">
                    {getJobLevelLabel(job.level)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <Badge variant="outline" className="text-xs">
                    {job.category ? getJobCategoryLabel(job.category) : "—"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden xl:table-cell text-xs">{job.profiles?.full_name || "—"}</TableCell>
                <TableCell className="hidden 2xl:table-cell">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {job.view_count ?? 0}
                  </span>
                </TableCell>
                <TableCell className="hidden 2xl:table-cell">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MousePointerClick className="h-3 w-3" />
                    {job.click_count ?? 0}
                  </span>
                </TableCell>
                <TableCell className="hidden 2xl:table-cell">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Share2 className="h-3 w-3" />
                    {job.share_count ?? 0}
                  </span>
                </TableCell>
                {adminMode && (
                  <TableCell className="hidden 2xl:table-cell">
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
                      {getJobStatusLabel(job.status)}
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setSelectedJob(job)}
                      >
                        <Info className="h-3 w-3 mr-1" /> Detalhes
                      </Button>
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
                  <Badge variant="outline" className="text-xs">
                    {JOB_SOURCE_LABELS[getJobSource(selectedJob.application_url)]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedJob.is_international ? "Internacional" : "Brasil"}
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

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vagas em massa</AlertDialogTitle>
            <AlertDialogDescription>
              {statusFilter !== "all" && (
                <>
                  Esta ação vai excluir permanentemente{" "}
                  <strong>
                    {bulkDeletableCount} vaga{bulkDeletableCount !== 1 ? "s" : ""}
                  </strong>{" "}
                  com status <strong>{getJobStatusLabel(statusFilter)}</strong>. Não é
                  possível desfazer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                bulkDeleteByStatus()
              }}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? "Excluindo..." : "Excluir todos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteSelectedOpen} onOpenChange={setBulkDeleteSelectedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vagas selecionadas</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação vai excluir permanentemente{" "}
              <strong>
                {selectedIds.size} vaga{selectedIds.size !== 1 ? "s" : ""}
              </strong>{" "}
              selecionada{selectedIds.size !== 1 ? "s" : ""}. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                bulkDeleteSelected()
              }}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? "Excluindo..." : "Excluir selecionadas"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
