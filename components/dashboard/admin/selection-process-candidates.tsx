"use client"

import { useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { MenteeHistoryDialog } from "@/components/dashboard/admin/mentee-history-dialog"
import {
  CheckCircle2, ExternalLink, FileText, Linkedin, Loader2, Trash2,
} from "lucide-react"
import {
  calculateSelectionProcessScore,
  SELECTION_PROCESS_CHECKLIST_MAX_SCORE,
} from "@/lib/selection-process-checklist"
import type { Profile, SelectionProcessChecklistItem, SelectionProcessCandidateWithProfile } from "@/lib/types/database"

interface SelectionProcessCandidatesProps {
  processId: string
  candidates: SelectionProcessCandidateWithProfile[]
  onChange: () => void
}

export function SelectionProcessCandidates({ processId, candidates, onChange }: SelectionProcessCandidatesProps) {
  const [savingId, setSavingId] = useState<string | null>(null)
  const [historyMentee, setHistoryMentee] = useState<Profile | null>(null)

  async function updateCandidate(
    candidateId: string,
    payload: { checklist?: SelectionProcessChecklistItem[]; notes?: string | null },
  ) {
    setSavingId(candidateId)
    try {
      await fetch(`/api/admin/selection-processes/${processId}/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      onChange()
    } finally {
      setSavingId(null)
    }
  }

  async function removeCandidate(candidateId: string) {
    if (!confirm("Remover este mentorado do processo seletivo?")) return
    setSavingId(candidateId)
    try {
      await fetch(`/api/admin/selection-processes/${processId}/candidates/${candidateId}`, {
        method: "DELETE",
      })
      onChange()
    } finally {
      setSavingId(null)
    }
  }

  if (candidates.length === 0) {
    return (
      <div className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
        Nenhum mentorado adicionado a este processo ainda
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Mentorado</TableHead>
              <TableHead className="w-32">Pontuacao</TableHead>
              <TableHead>Observacoes</TableHead>
              <TableHead>Links</TableHead>
              <TableHead>Historico</TableHead>
              <TableHead className="w-20">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate, index) => {
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
                      candidate={candidate}
                      saving={savingId === candidate.id}
                      onSave={(checklist) => updateCandidate(candidate.id, { checklist })}
                    />
                  </TableCell>
                  <TableCell className="min-w-48">
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
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setHistoryMentee(profile || null)}
                      disabled={!profile}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {candidate.booking_count ?? 0} sessoes
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive"
                      onClick={() => removeCandidate(candidate.id)}
                      disabled={savingId === candidate.id}
                    >
                      {savingId === candidate.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <MenteeHistoryDialog
        mentee={historyMentee}
        open={!!historyMentee}
        onClose={() => setHistoryMentee(null)}
      />
    </>
  )
}

function ChecklistPopover({
  candidate,
  saving,
  onSave,
}: {
  candidate: SelectionProcessCandidateWithProfile
  saving: boolean
  onSave: (checklist: SelectionProcessChecklistItem[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [checklist, setChecklist] = useState(candidate.checklist)

  useEffect(() => {
    if (!open) setChecklist(candidate.checklist)
  }, [candidate.checklist, open])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      const changed = checklist.some((item, i) => item.checked !== candidate.checklist[i]?.checked)
      if (changed) onSave(checklist)
    }
    setOpen(nextOpen)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          {calculateSelectionProcessScore(checklist)}/{SELECTION_PROCESS_CHECKLIST_MAX_SCORE} pontos
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="grid gap-2">
          <p className="text-sm font-medium">Checklist de avaliação</p>
          {checklist.map((item) => {
            const checkboxId = `selection-checklist-${candidate.id}-${item.id}`
            return (
              <div key={item.id} className="flex items-start gap-2">
                <Checkbox
                  id={checkboxId}
                  checked={item.checked}
                  onCheckedChange={(checked) =>
                    setChecklist((prev) =>
                      prev.map((p) => (p.id === item.id ? { ...p, checked: checked === true } : p)),
                    )
                  }
                  className="mt-0.5"
                />
                <Label htmlFor={checkboxId} className="text-xs font-normal leading-tight">
                  {item.label}
                </Label>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
