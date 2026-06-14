"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SelectionProcessForm } from "@/components/dashboard/admin/selection-process-form"
import { SelectionProcessCandidates } from "@/components/dashboard/admin/selection-process-candidates"
import { AddSelectionCandidatesDialog } from "@/components/dashboard/admin/add-selection-candidates-dialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Pencil, Plus } from "lucide-react"
import Link from "next/link"
import type { SelectionProcess, SelectionProcessCandidateWithProfile } from "@/lib/types/database"

interface SelectionProcessDetail extends SelectionProcess {
  candidates: SelectionProcessCandidateWithProfile[]
}

export default function AdminSelectionProcessDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [process, setProcess] = useState<SelectionProcessDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showAddCandidates, setShowAddCandidates] = useState(false)

  const loadProcess = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/selection-processes/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          router.replace("/admin/selection-processes")
          return
        }
        setProcess(json.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id, router])

  useEffect(() => { loadProcess() }, [loadProcess])

  function handleEditSuccess() {
    setShowEditForm(false)
    loadProcess()
  }

  function handleAddSuccess() {
    setShowAddCandidates(false)
    loadProcess()
  }

  if (loading || !process) {
    return (
      <>
        <DashboardHeader title="Processo Seletivo" />
        <div className="flex flex-col gap-4 p-4 md:p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </>
    )
  }

  return (
    <>
      <DashboardHeader title={process.company} description={process.position}>
        <Button size="sm" variant="outline" onClick={() => setShowAddCandidates(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar mentorados
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowEditForm(true)}>
          <Pencil className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </DashboardHeader>

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Link href="/admin/selection-processes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para processos seletivos
        </Link>

        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{process.company} — {process.position}</h2>
            <Badge variant={process.status === "open" ? "default" : "outline"}>
              {process.status === "open" ? "Aberto" : "Encerrado"}
            </Badge>
          </div>
          {process.description && (
            <p className="mt-2 text-sm text-muted-foreground">{process.description}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Candidatos ranqueados</h3>
          <SelectionProcessCandidates
            processId={process.id}
            candidates={process.candidates}
            onChange={loadProcess}
          />
        </div>
      </div>

      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar processo seletivo</DialogTitle>
          </DialogHeader>
          <SelectionProcessForm process={process} onSuccess={handleEditSuccess} />
        </DialogContent>
      </Dialog>

      <AddSelectionCandidatesDialog
        open={showAddCandidates}
        processId={process.id}
        excludeIds={process.candidates.map((c) => c.mentee_id)}
        onClose={() => setShowAddCandidates(false)}
        onSuccess={handleAddSuccess}
      />
    </>
  )
}
