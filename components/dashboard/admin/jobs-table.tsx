"use client"

import { useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, XCircle } from "lucide-react"
import type { JobWithAuthor } from "@/lib/types/database"

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
  const [jobs, setJobs] = useState<JobWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

  function loadJobs() {
    setLoading(true)
    fetch(adminMode ? "/api/admin/jobs" : "/api/jobs")
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

  const visibleJobs = showAll ? jobs : jobs.filter((j) => j.status === "pending")
  const showActions = adminMode
  const columnCount = showActions ? 7 : 6

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titulo</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Nivel</TableHead>
            <TableHead>Autor</TableHead>
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
                <TableCell className="text-xs">{job.profiles?.full_name || "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={job.status === "approved" ? "default" : "outline"}
                    className="text-xs capitalize"
                  >
                    {job.status === "approved" ? "Aprovada" : job.status === "pending" ? "Pendente" : "Rejeitada"}
                  </Badge>
                </TableCell>
                {showActions && (
                  <TableCell>
                    {job.status === "pending" ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="text-xs h-7"
                          onClick={() => updateStatus(job.id, "approved")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive"
                          onClick={() => updateStatus(job.id, "rejected")}>
                          <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
