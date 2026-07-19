"use client"

import { useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { CheckCircle2, ShieldBan, Clock, Trash2 } from "lucide-react"
import type { CompanyFeedbackCategory, CompanyFeedbackStatus } from "@/lib/types/database"

interface CompanyFeedbackRow {
  id: string
  company: string
  category: CompanyFeedbackCategory
  comment: string | null
  status: CompanyFeedbackStatus
  adminNotes: string | null
  createdAt: string
  profileName: string | null
  profileEmail: string | null
}

const CATEGORY_LABELS: Record<CompanyFeedbackCategory, string> = {
  salario_baixo: "Salário baixo",
  processo_longo: "Processo longo",
  nao_confiavel: "Não confiável",
  processos_inexistentes: "Processos inexistentes",
  outro: "Outro",
}

const STATUS_LABELS: Record<CompanyFeedbackStatus, string> = {
  pending: "Pendente",
  reviewed: "Analisado",
  blocked: "Empresa bloqueada",
}

const STATUS_COLORS: Record<CompanyFeedbackStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  reviewed: "bg-blue-500/10 text-blue-500",
  blocked: "bg-red-500/10 text-red-500",
}

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export function CompanyFeedbacksTable() {
  const [feedbacks, setFeedbacks] = useState<CompanyFeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | CompanyFeedbackStatus>("all")
  const [deletingCompany, setDeletingCompany] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch("/api/admin/company-feedbacks")
      .then((r) => r.json())
      .then((json) => setFeedbacks(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id: string, status: CompanyFeedbackStatus) {
    await fetch(`/api/admin/company-feedbacks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    load()
  }

  async function deleteCompanyJobs(company: string) {
    if (!confirm(`Tem certeza que deseja excluir TODAS as vagas da empresa "${company}"?`)) return

    setDeletingCompany(company)
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(`${data.deleted || 0} vaga(s) da empresa "${company}" excluída(s).`)
      } else {
        alert(data.error || "Erro ao excluir vagas")
      }
    } catch {
      alert("Erro ao excluir vagas")
    } finally {
      setDeletingCompany(null)
    }
  }

  const filtered = filter === "all"
    ? feedbacks
    : feedbacks.filter((f) => f.status === filter)

  const pendingCount = feedbacks.filter((f) => f.status === "pending").length

  function StatusActions({ f }: { f: CompanyFeedbackRow }) {
    return (
      <>
        {f.status === "pending" && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => updateStatus(f.id, "reviewed")}>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Analisar
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive"
              onClick={() => updateStatus(f.id, "blocked")}>
              <ShieldBan className="h-3 w-3 mr-1" />
              Bloquear
            </Button>
          </>
        )}
        {f.status === "reviewed" && (
          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive"
            onClick={() => updateStatus(f.id, "blocked")}>
            <ShieldBan className="h-3 w-3 mr-1" />
            Bloquear
          </Button>
        )}
        {f.status === "blocked" && (
          <Button size="sm" variant="outline" className="h-7 text-xs"
            onClick={() => updateStatus(f.id, "reviewed")}>
            Desbloquear
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs text-destructive"
          disabled={deletingCompany === f.company}
          onClick={() => deleteCompanyJobs(f.company)}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          {deletingCompany === f.company ? "Excluindo..." : "Excluir vagas"}
        </Button>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Select value={filter} onValueChange={(v) => setFilter(v as "all" | CompanyFeedbackStatus)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({feedbacks.length})</SelectItem>
            <SelectItem value="pending">Pendentes ({pendingCount})</SelectItem>
            <SelectItem value="reviewed">Analisados</SelectItem>
            <SelectItem value="blocked">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border p-4">
              <Skeleton className="mb-3 h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum feedback encontrado
          </div>
        ) : (
          filtered.map((f) => (
            <div key={f.id} className="rounded-md border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{f.company}</h3>
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {CATEGORY_LABELS[f.category]}
                  </Badge>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[f.status]}`}>
                  {STATUS_LABELS[f.status]}
                </span>
              </div>
              {f.comment && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{f.comment}</p>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground">
                {f.profileName || f.profileEmail || "Anônimo"} · {DATE_FORMATTER.format(new Date(f.createdAt))}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusActions f={f} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Comentário</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum feedback encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.company}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[f.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <span className="text-xs text-muted-foreground line-clamp-2">
                      {f.comment || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {f.profileName || f.profileEmail || "—"}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {DATE_FORMATTER.format(new Date(f.createdAt))}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[f.status]}`}>
                      {f.status === "pending" && <Clock className="h-3 w-3" />}
                      {STATUS_LABELS[f.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <StatusActions f={f} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
