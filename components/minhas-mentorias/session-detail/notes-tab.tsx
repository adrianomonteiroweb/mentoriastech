import { GraduationCap } from "lucide-react"
import type { MenteeBookingItem } from "@/lib/db/mentee-bookings"

interface NotesTabProps {
  booking: MenteeBookingItem
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
  const hasAny = Boolean(
    booking.topicsDiscussed || booking.menteeStrengths || booking.menteeGrowthAreas || booking.adminNotes || booking.notes
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
