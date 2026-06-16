"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { ChecklistPopover } from "@/components/shared/checklist-popover"
import { ExternalLink, FileText, Linkedin } from "lucide-react"
import type { SelectionProcessChecklistItem, ShareLinkPermission } from "@/lib/types/database"

interface SharedCandidate {
  id: string
  process_id: string
  mentee_id: string
  score: number | null
  checklist: SelectionProcessChecklistItem[]
  notes: string | null
  profiles?: {
    full_name: string | null
    email: string | null
    linkedin_url: string | null
    portfolio_url: string | null
    resume_url: string | null
  } | null
  booking_count?: number
}

interface SharedProcess {
  id: string
  company: string
  position: string
  description: string | null
  status: string
  candidates: SharedCandidate[]
}

interface SelectionProcessViewProps {
  token: string
}

export function SelectionProcessView({ token }: SelectionProcessViewProps) {
  const [process, setProcess] = useState<SharedProcess | null>(null)
  const [permission, setPermission] = useState<ShareLinkPermission>("view")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const loadProcess = useCallback(() => {
    setLoading(true)
    fetch(`/api/shared/selection-processes/${token}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error)
          return
        }
        setProcess(json.data)
        setPermission(json.permission)
      })
      .catch(() => setError("Erro ao carregar processo seletivo"))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { loadProcess() }, [loadProcess])

  async function updateCandidate(
    candidateId: string,
    payload: { checklist?: SelectionProcessChecklistItem[]; notes?: string | null },
  ) {
    setSavingId(candidateId)
    try {
      await fetch(`/api/shared/selection-processes/${token}/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      loadProcess()
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error || !process) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-6 py-8 text-center">
          <h2 className="text-lg font-semibold">Link invalido</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || "Este link nao existe ou foi revogado."}
          </p>
        </div>
      </div>
    )
  }

  const isEdit = permission === "edit"

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{process.company} — {process.position}</h2>
          <Badge variant={process.status === "open" ? "default" : "outline"}>
            {process.status === "open" ? "Aberto" : "Encerrado"}
          </Badge>
          <Badge variant="secondary">
            {isEdit ? "Edicao permitida" : "Somente visualizacao"}
          </Badge>
        </div>
        {process.description && (
          <p className="mt-2 text-sm text-muted-foreground">{process.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Candidatos ranqueados</h3>
        {process.candidates.length === 0 ? (
          <div className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum candidato neste processo
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead className="w-32">Pontuacao</TableHead>
                  <TableHead>Observacoes</TableHead>
                  <TableHead>Links</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {process.candidates.map((candidate, index) => {
                  const profile = candidate.profiles
                  return (
                    <TableRow key={candidate.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{profile?.full_name || "Sem nome"}</span>
                          <span className="text-xs text-muted-foreground">{profile?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ChecklistPopover
                          candidateId={candidate.id}
                          checklist={candidate.checklist}
                          saving={savingId === candidate.id}
                          readOnly={!isEdit}
                          onSave={(checklist) => updateCandidate(candidate.id, { checklist })}
                        />
                      </TableCell>
                      <TableCell className="min-w-48">
                        {isEdit ? (
                          <Textarea
                            defaultValue={candidate.notes || ""}
                            placeholder="Observacoes sobre o candidato"
                            className="min-h-16 text-xs"
                            onBlur={(e) => {
                              const notes = e.target.value.trim() || null
                              if (notes !== (candidate.notes || null)) {
                                updateCandidate(candidate.id, { notes })
                              }
                            }}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {candidate.notes || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {profile?.resume_url && (
                            <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                              <FileText className="h-3 w-3" /> Curriculo
                            </a>
                          )}
                          {profile?.linkedin_url && (
                            <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                              <Linkedin className="h-3 w-3" /> LinkedIn
                            </a>
                          )}
                          {profile?.portfolio_url && (
                            <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                              <ExternalLink className="h-3 w-3" /> Portfolio
                            </a>
                          )}
                          {!profile?.resume_url && !profile?.linkedin_url && !profile?.portfolio_url && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
