"use client"

import { useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MenteeHistoryDialog } from "@/components/dashboard/admin/mentee-history-dialog"
import { ChecklistPopover } from "@/components/shared/checklist-popover"
import {
  CheckCircle2, ExternalLink, FileText, Linkedin, Loader2, Trash2,
} from "lucide-react"
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
                      candidateId={candidate.id}
                      checklist={candidate.checklist}
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

