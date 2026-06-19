"use client"

import { useState } from "react"
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Briefcase,
  Linkedin,
  LogOut,
  Mail,
  MessageCircle,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { MenteeBookingItem } from "@/lib/db/mentee-bookings"
import {
  buildEmailCorrectionLink,
  buildWhatsAppCorrectionLink,
} from "@/lib/mentor-contact"
import { ProfileAssets } from "@/components/minhas-mentorias/profile-assets"
import { BookingAttachmentsView } from "@/components/minhas-mentorias/booking-attachments-view"
import { BookingTasksView } from "@/components/minhas-mentorias/booking-tasks-view"

interface Props {
  email: string
  bookings: MenteeBookingItem[]
}

function formatDate(d: string | null) {
  if (!d) return "Sem data"
  return d.split("-").reverse().join("/")
}

function formatTime(t: string | null) {
  if (!t) return ""
  return t.substring(0, 5)
}

function Section({ title, content }: { title: string; content: string | null }) {
  if (!content || !content.trim()) return null
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
        {title}
      </h4>
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {content}
      </p>
    </div>
  )
}

function BookingCard({ booking }: { booking: MenteeBookingItem }) {
  const [expanded, setExpanded] = useState(false)

  const whatsapp = buildWhatsAppCorrectionLink({
    bookingDate: booking.sessionDate,
    topicName: booking.topicName,
  })
  const emailLink = buildEmailCorrectionLink({
    bookingDate: booking.sessionDate,
    topicName: booking.topicName,
  })

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {booking.topicName || "Mentoria"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDate(booking.sessionDate)}
              </span>
              {booking.startTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(booking.startTime)}
                </span>
              )}
              <Badge variant="outline" className="text-xs capitalize">
                {booking.bookingType}
              </Badge>
            </div>
          </div>
          <a
            href={`/api/minhas-mentorias/pdf/${booking.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </a>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-center gap-1 rounded-md border border-border bg-secondary/50 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Ocultar anotações
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Ver anotações
            </>
          )}
        </button>

        {expanded && (
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-background/50 p-4">
            <Section title="Tópicos discutidos" content={booking.topicsDiscussed} />
            <Section
              title="Pontos fortes identificados"
              content={booking.menteeStrengths}
            />
            <Section
              title="Áreas para desenvolver"
              content={booking.menteeGrowthAreas}
            />
            <Section title="Anotações gerais" content={booking.notes} />
            <Section title="Anotações do mentor" content={booking.adminNotes} />

            <BookingTasksView bookingId={booking.id} />
            <BookingAttachmentsView bookingId={booking.id} />

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                Identificou algo a corrigir?
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-1.5 text-xs text-[#15803d] hover:bg-[#25D366]/20 dark:text-[#4ade80]"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
                <a
                  href={emailLink}
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </a>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function MentoriasHistory({ email, bookings }: Props) {
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/minhas-mentorias/logout", { method: "POST" })
    router.push("/minhas-mentorias")
    router.refresh()
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-foreground">
              Minhas Mentorias
            </h1>
            <p className="text-xs text-muted-foreground">
              Acesso via {email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </header>

        <ProfileAssets />

        <div className="flex flex-col gap-2">
          <Link
            href="/minhas-mentorias/curriculo"
            className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Melhorar currículo com IA
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/minhas-mentorias/linkedin"
            className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <span className="flex items-center gap-2">
              <Linkedin className="h-4 w-4" />
              Melhorar perfil LinkedIn com IA
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/minhas-mentorias/oportunidades"
            className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <span className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Painel de Oportunidades
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/minhas-mentorias/plano-de-estudos"
            className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <span className="flex items-center gap-2">
              <BookOpenCheck className="h-4 w-4" />
              Plano de Estudos com IA
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs text-amber-800 dark:text-amber-200">
            <p className="font-semibold text-amber-900 dark:text-amber-100">Como ler estas anotações</p>
            <p className="leading-relaxed">
              Trate este registro como um <strong>guia</strong>: leia com calma e
              verifique se há erros, interpretações equivocadas sobre você ou sobre
              sua carreira, ou pontos que precisam de mais contexto. Se identificar
              algo a corrigir, use os botões de WhatsApp ou Email em cada mentoria
              para solicitar a revisão ao mentor.
            </p>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-lg border border-border bg-secondary/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem mentorias com anotações registradas.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Assim que o mentor concluir e registrar as anotações de uma sessão,
              ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
