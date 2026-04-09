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
}

export function JobsTable({ showAll = false }: JobsTableProps) {
  const [jobs, setJobs] = useState<JobWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

  function loadJobs() {
    setLoading(true)
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((json) => setJobs(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadJobs() }, [])

  async function updateStatus(id: string, status: "approved" | "rejected") {
    await fetch(`/api/admin/jobs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    loadJobs()
  }

  const pending = showAll ? jobs : jobs.filter((j) => j.status === "pending")

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titulo</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Autor</TableHead>
            <TableHead>Status</TableHead>
            {!showAll && <TableHead>Acoes</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: showAll ? 5 : 6 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : pending.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showAll ? 5 : 6} className="text-center text-muted-foreground py-8">
                {showAll ? "Nenhuma vaga cadastrada" : "Nenhuma vaga pendente"}
              </TableCell>
            </TableRow>
          ) : (
            pending.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">{job.title}</TableCell>
                <TableCell>{job.company || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">{job.job_type}</Badge>
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
                {!showAll && (
                  <TableCell>
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
