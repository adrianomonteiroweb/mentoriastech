"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Check, Globe, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PhoneNumberInput } from "@/components/ui/phone-number-input"
import { cn } from "@/lib/utils"
import type { LearningTrackWithPhases } from "@/lib/types/database"

interface ScheduleSlot {
  slotId: string
  dayName: string
  startTime: string
  slotType: string
  date: string
  isAvailable: boolean
}

interface TrilhaEnrollFormProps {
  tracks: LearningTrackWithPhases[]
  mode: "public" | "authenticated"
  endpoint: string
  defaultTrackId?: string
  onSuccess?: () => void
}

function formatDate(date: string): string {
  const [, m, d] = date.split("-")
  return `${d}/${m}`
}

export function TrilhaEnrollForm({
  tracks,
  mode,
  endpoint,
  defaultTrackId,
  onSuccess,
}: TrilhaEnrollFormProps) {
  const [trackId, setTrackId] = useState(defaultTrackId || tracks[0]?.id || "")
  const [isReturningMentee, setIsReturningMentee] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [targetInternational, setTargetInternational] = useState(false)
  const [englishInterviews, setEnglishInterviews] = useState(false)
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const selectedTrack = useMemo(
    () => tracks.find((t) => t.id === trackId) || null,
    [tracks, trackId],
  )
  // Nudge: alvo internacional liga inglês por padrão (se a trilha suportar).
  const includeEnglish = Boolean(selectedTrack?.supports_english && targetInternational)

  useEffect(() => {
    let active = true
    setLoadingSlots(true)
    fetch("/api/schedule")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return
        const available: ScheduleSlot[] = (data.schedule || [])
          .filter((s: ScheduleSlot) => s.isAvailable && s.slotType === "free")
          .slice(0, 12)
        setSlots(available)
      })
      .catch(() => {
        if (active) setSlots([])
      })
      .finally(() => {
        if (active) setLoadingSlots(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!trackId) return setError("Selecione uma trilha.")
    if (!selectedSlot) return setError("Escolha um horario para a Fase 1.")
    if (mode === "public") {
      if (!email.trim()) return setError("Informe seu email.")
      if (!isReturningMentee) {
        if (!name.trim()) return setError("Informe seu nome.")
        if (!whatsapp.trim()) return setError("Informe seu WhatsApp.")
      }
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        trackId,
        targetInternational,
        englishInterviews: includeEnglish && englishInterviews,
        slotId: selectedSlot.slotId,
        sessionDate: selectedSlot.date,
        startTime: selectedSlot.startTime,
      }
      if (mode === "public") {
        payload.email = email.trim()
        payload.isReturningMentee = isReturningMentee
        if (!isReturningMentee) {
          payload.name = name.trim()
          payload.whatsapp = whatsapp.trim()
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error || "Erro ao enviar inscricao.")
        setSubmitting(false)
        return
      }

      setSuccess(true)
      onSuccess?.()
    } catch {
      setError("Erro ao enviar inscricao.")
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Check className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Inscricao enviada!
        </h3>
        <p className="text-sm text-muted-foreground">
          Sua inscricao ficou <strong>pendente</strong>. Assim que for confirmada,
          a Fase 1 sera agendada no horario que voce escolheu e voce podera
          acompanhar tudo em Minhas Mentorias.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {selectedTrack?.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={selectedTrack.cover_image_url}
          alt={`Capa da trilha ${selectedTrack.title}`}
          loading="lazy"
          decoding="async"
          className="mx-auto h-auto w-full max-h-[40vh] rounded-lg border border-border object-contain bg-secondary/30"
        />
      )}

      {/* Seleção de trilha */}
      {tracks.length > 1 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Trilha
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {tracks.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => setTrackId(track.id)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  trackId === track.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                <span className="block text-sm font-semibold text-foreground">
                  {track.title}
                </span>
                {track.description && (
                  <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                    {track.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Alvo internacional → inglês (nudge + commitment) */}
      {selectedTrack?.supports_english && (
        <div className="rounded-lg border border-border p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={targetInternational}
              onChange={(e) => setTargetInternational(e.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Globe className="h-4 w-4 text-primary" />
                Quero concorrer a vagas no exterior
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Incluiremos a fase de <strong>Inglês básico (A1)</strong> na sua trilha.
              </span>
            </span>
          </label>

          {includeEnglish && (
            <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={englishInterviews}
                  onChange={(e) => setEnglishInterviews(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span className="text-xs text-muted-foreground">
                  Quero treinar as entrevistas <strong>em inglês</strong> (comprehensible
                  input / slow english).
                </span>
              </label>

              {selectedTrack.english_mentorship && (
                <div className="flex items-center gap-3 rounded-md bg-primary/5 p-3">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Indicacao:{" "}
                    <strong className="text-foreground">
                      {selectedTrack.english_mentorship.title}
                    </strong>{" "}
                    — mentoria de ingles para acelerar a Fase 2.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dados de contato (apenas público) */}
      {mode === "public" && (
        <div className="flex flex-col gap-3">
          {/* Primeira vez x recorrente (menos fricção para quem já é mentorado) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Você já é mentorado?
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsReturningMentee(false)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  !isReturningMentee
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                Primeira vez
              </button>
              <button
                type="button"
                onClick={() => setIsReturningMentee(true)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  isReturningMentee
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                Já sou mentorado
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className={cn(
                "flex flex-col gap-1.5",
                isReturningMentee && "sm:col-span-2",
              )}
            >
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {isReturningMentee ? "E-mail usado antes" : "Email"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                placeholder={
                  isReturningMentee
                    ? "email usado na mentoria anterior"
                    : "seu@email.com"
                }
              />
            </div>

            {!isReturningMentee && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    WhatsApp
                  </label>
                  <PhoneNumberInput
                    id="trilha-whatsapp"
                    value={whatsapp}
                    onChange={setWhatsapp}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Nome
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                    placeholder="Seu nome"
                  />
                </div>
              </>
            )}
          </div>

          {isReturningMentee && (
            <p className="text-xs text-muted-foreground">
              Vamos localizar seu cadastro pelo e-mail usado em mentorias
              anteriores.
            </p>
          )}
        </div>
      )}

      {/* Slot da Fase 1 */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Horario da Fase 1 (Posicionamento)
        </label>
        {loadingSlots ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando horarios...
          </div>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum horario livre no momento. Tente novamente mais tarde.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => {
              const key = `${slot.slotId}_${slot.date}`
              const selected =
                selectedSlot?.slotId === slot.slotId &&
                selectedSlot?.date === slot.date
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <span className="block font-semibold">{formatDate(slot.date)}</span>
                  <span className="block">{slot.startTime}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        Solicitar trilha
      </Button>

      <p className="text-xs text-muted-foreground">
        Sua inscricao fica pendente ate a confirmacao do mentor. Voce acompanha o
        progresso em Minhas Mentorias.
      </p>
      {/* Endowed progress / framing das 6 fases */}
      {selectedTrack && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedTrack.phases
            .filter((p) => p.phase_key !== "english" || includeEnglish)
            .map((phase, index) => (
              <Badge key={phase.id} variant="secondary" className="text-[10px]">
                {index + 1}. {phase.title}
              </Badge>
            ))}
        </div>
      )}
    </form>
  )
}
