"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type {
  BookingWithRelations,
  CareerStatus,
  Seniority,
} from "@/lib/types/database"

const CAREER_STATUS_OPTIONS: { value: CareerStatus; label: string }[] = [
  { value: "seeking", label: "Buscando oportunidade" },
  { value: "interning", label: "Estagiando" },
  { value: "employed", label: "Empregado" },
  { value: "student", label: "Estudante" },
  { value: "other", label: "Outro" },
]

const SENIORITY_OPTIONS: { value: Seniority; label: string }[] = [
  { value: "junior", label: "Júnior" },
  { value: "mid", label: "Pleno" },
  { value: "senior", label: "Sênior" },
  { value: "undefined", label: "Indefinido" },
]

interface CompleteBookingDialogProps {
  booking: BookingWithRelations | null
  open: boolean
  onClose: () => void
  onCompleted: () => void
}

export function CompleteBookingDialog({
  booking,
  open,
  onClose,
  onCompleted,
}: CompleteBookingDialogProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [topicsDiscussed, setTopicsDiscussed] = useState("")
  const [menteeStrengths, setMenteeStrengths] = useState("")
  const [menteeGrowthAreas, setMenteeGrowthAreas] = useState("")
  const [adminNotes, setAdminNotes] = useState("")

  const [careerStatus, setCareerStatus] = useState<CareerStatus | "">("")
  const [seniority, setSeniority] = useState<Seniority | "">("")
  const [careerFocus, setCareerFocus] = useState("")

  useEffect(() => {
    if (!booking) return
    setError("")
    setTopicsDiscussed(booking.topics_discussed || "")
    setMenteeStrengths(booking.mentee_strengths || "")
    setMenteeGrowthAreas(booking.mentee_growth_areas || "")
    setAdminNotes(booking.admin_notes || "")
    setCareerStatus((booking.profiles?.career_status as CareerStatus) || "")
    setSeniority((booking.profiles?.seniority as Seniority) || "")
    setCareerFocus(booking.profiles?.career_focus || "")
  }, [booking])

  if (!booking) return null

  const hasMentee = !!booking.mentee_id
  const menteeName =
    booking.profiles?.full_name || booking.guest_name || "Mentorado"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!booking) return

    setSaving(true)
    setError("")

    const payload: Record<string, unknown> = {
      status: "completed",
      topics_discussed: topicsDiscussed,
      mentee_strengths: menteeStrengths,
      mentee_growth_areas: menteeGrowthAreas,
      admin_notes: adminNotes,
    }

    if (hasMentee) {
      payload.mentee_profile_update = {
        career_status: careerStatus || null,
        seniority: seniority || null,
        career_focus: careerFocus || null,
      }
    }

    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao concluir mentoria")
      }

      onCompleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Concluir mentoria</DialogTitle>
          <DialogDescription>
            Registre como foi a sessão com {menteeName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <section className="grid gap-4">
            <h3 className="text-sm font-semibold text-foreground">Sobre a sessão</h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="topics-discussed">Dúvidas e temas abordados</Label>
              <Textarea
                id="topics-discussed"
                value={topicsDiscussed}
                onChange={(e) => setTopicsDiscussed(e.target.value)}
                rows={3}
                placeholder="Quais dúvidas o mentorado trouxe?"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mentee-strengths">Pontos positivos do mentorado</Label>
              <Textarea
                id="mentee-strengths"
                value={menteeStrengths}
                onChange={(e) => setMenteeStrengths(e.target.value)}
                rows={3}
                placeholder="O que se destacou positivamente"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mentee-growth">Pontos a desenvolver</Label>
              <Textarea
                id="mentee-growth"
                value={menteeGrowthAreas}
                onChange={(e) => setMenteeGrowthAreas(e.target.value)}
                rows={3}
                placeholder="O que pode ser trabalhado"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-notes">Anotações privadas</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Notas internas (apenas você visualiza)"
              />
            </div>
          </section>

          {hasMentee && (
            <section className="grid gap-4 border-t border-border pt-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Perfil do mentorado
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Atualiza o cadastro de {menteeName} para futuras mentorias.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Status profissional</Label>
                  <Select
                    value={careerStatus || "none"}
                    onValueChange={(value) =>
                      setCareerStatus(value === "none" ? "" : (value as CareerStatus))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não informado</SelectItem>
                      {CAREER_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Senioridade</Label>
                  <Select
                    value={seniority || "none"}
                    onValueChange={(value) =>
                      setSeniority(value === "none" ? "" : (value as Seniority))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não informado</SelectItem>
                      {SENIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="career-focus">Foco de carreira</Label>
                <Input
                  id="career-focus"
                  value={careerFocus}
                  onChange={(e) => setCareerFocus(e.target.value)}
                  placeholder="Ex.: Backend Java, Dados, RPA, Front-end..."
                />
              </div>
            </section>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Concluir mentoria
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
