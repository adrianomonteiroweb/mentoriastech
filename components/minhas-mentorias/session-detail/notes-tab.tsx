import { GraduationCap, Sparkles } from "lucide-react"
import type { MenteeBookingItem } from "@/lib/db/mentee-bookings"

interface NotesTabProps {
  booking: MenteeBookingItem
}

const AI_SUMMARY_SECTIONS: { key: string; label: string }[] = [
  { key: "resumo", label: "Resumo" },
  { key: "topicos_discutidos", label: "Tópicos discutidos" },
  { key: "pontos_fortes", label: "Pontos fortes" },
  { key: "areas_desenvolvimento", label: "Áreas para desenvolver" },
  { key: "proximos_passos", label: "Próximos passos" },
]

function parseAiSummary(value: string | null): { key: string; label: string; text: string }[] {
  if (!value?.trim()) return []
  let data: Record<string, unknown>
  try {
    data = JSON.parse(value) as Record<string, unknown>
  } catch {
    return [{ key: "resumo", label: "Resumo", text: value }]
  }
  return AI_SUMMARY_SECTIONS.map((s) => ({
    ...s,
    text: typeof data[s.key] === "string" ? (data[s.key] as string).trim() : "",
  })).filter((s) => s.text)
}

function NoteSection({ title, content }: { title: string; content: string | null }) {
  if (!content?.trim()) return null

  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">
        {title}
      </h4>
      <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
        {content}
      </p>
    </div>
  )
}

export function NotesTab({ booking }: NotesTabProps) {
  const aiSummary = parseAiSummary(booking.aiSummary)
  const hasAny = Boolean(
    booking.topicsDiscussed || booking.menteeStrengths || booking.menteeGrowthAreas || booking.adminNotes || booking.notes || aiSummary.length
  )

  if (!hasAny) {
    return (
      <div className="py-8 text-center">
        <p className="text-base text-muted-foreground">
          Nenhuma anotação registrada para esta sessão.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          As anotações aparecerão aqui assim que o mentor registrá-las.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {aiSummary.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">
              Resumo gerado por IA
            </h4>
          </div>
          {aiSummary.map((s) => (
            <div key={s.key} className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
              <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
                {s.text}
              </p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Resumo automático a partir do áudio da sessão. Pode conter imprecisões.
          </p>
        </div>
      )}

      <NoteSection title="Tópicos Discutidos" content={booking.topicsDiscussed} />
      <NoteSection title="Pontos Fortes Identificados" content={booking.menteeStrengths} />
      <NoteSection title="Áreas para Desenvolver" content={booking.menteeGrowthAreas} />
      <NoteSection title="Anotações Gerais" content={booking.notes} />

      {booking.adminNotes?.trim() && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary">
              Notas do Mentor
            </h4>
          </div>
          <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
            {booking.adminNotes}
          </p>
        </div>
      )}
    </div>
  )
}
