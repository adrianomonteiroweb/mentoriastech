"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight, Trash2, Users } from "lucide-react"
import type { SelectionProcess } from "@/lib/types/database"

interface SelectionProcessesTableProps {
  refreshKey?: number
}

export function SelectionProcessesTable({ refreshKey = 0 }: SelectionProcessesTableProps) {
  const [processes, setProcesses] = useState<SelectionProcess[]>([])
  const [loading, setLoading] = useState(true)

  function loadProcesses() {
    setLoading(true)
    fetch("/api/admin/selection-processes")
      .then((r) => r.json())
      .then((json) => setProcesses(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadProcesses() }, [refreshKey])

  async function deleteProcess(id: string) {
    if (!confirm("Remover este processo seletivo? Os candidatos associados tambem serao removidos.")) return
    await fetch(`/api/admin/selection-processes/${id}`, { method: "DELETE" })
    loadProcesses()
  }

  const columnCount = 6

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Posicao</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Candidatos</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Acoes</TableHead>
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
          ) : processes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="text-center text-muted-foreground py-8">
                Nenhum processo seletivo cadastrado
              </TableCell>
            </TableRow>
          ) : (
            processes.map((process) => (
              <TableRow key={process.id}>
                <TableCell className="font-medium">{process.company}</TableCell>
                <TableCell>{process.position}</TableCell>
                <TableCell>
                  <Badge variant={process.status === "open" ? "default" : "outline"} className="text-xs">
                    {process.status === "open" ? "Aberto" : "Encerrado"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {process.candidate_count ?? 0}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(process.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                      <Link href={`/admin/selection-processes/${process.id}`}>
                        Ver detalhes <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive"
                      onClick={() => deleteProcess(process.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remover
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
