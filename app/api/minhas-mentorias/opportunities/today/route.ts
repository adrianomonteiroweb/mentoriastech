import { NextResponse } from "next/server"
import { getTodayActions } from "@/lib/db/mentee-opportunities"
import { requireMenteeAccess } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"
import { mapOpportunity } from "../route"

export const dynamic = "force-dynamic"

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function formatTimeUntil(date: Date | null): string {
  if (!date) return ""
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 0) {
    const daysAgo = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24))
    if (daysAgo === 0) return "Hoje"
    if (daysAgo === 1) return "Ha 1 dia"
    return `Ha ${daysAgo} dias`
  }
  if (hours === 0) return "Em breve"
  if (hours < 24) return `Em ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Amanha"
  return `Em ${days} dias`
}

function daysSince(date: Date | string | null): number {
  if (!date) return 999
  const d = date instanceof Date ? date : new Date(date)
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

// GET /api/minhas-mentorias/opportunities/today
export async function GET() {
  try {
    const session = await requireMenteeAccess()
    const profile = await ensureProfileForMenteeEmail(session.email)

    const { interviewsSoon, overdueFollowUps, offers, stale } =
      await getTodayActions(profile.id)

    const actions = []

    // 1. Entrevistas em <24h (prioridade maxima)
    for (const row of interviewsSoon) {
      actions.push({
        id: `interview-${row.opportunity.id}`,
        type: "interview_soon" as const,
        title: "Preparar entrevista",
        subtitle: `${row.companyName} · ${row.opportunity.title || "Vaga"} · ${formatTimeUntil(row.opportunity.nextInterviewAt)}`,
        urgency: "critical" as const,
        opportunity: mapOpportunity(row),
      })
    }

    // 2. Propostas recebidas
    for (const row of offers) {
      actions.push({
        id: `offer-${row.opportunity.id}`,
        type: "offer_received" as const,
        title: "Avaliar proposta",
        subtitle: `${row.companyName} · ${row.opportunity.title || "Vaga"}`,
        urgency: "high" as const,
        opportunity: mapOpportunity(row),
      })
    }

    // 3. Follow-ups vencidos
    for (const row of overdueFollowUps) {
      const days = daysSince(row.opportunity.nextFollowUpAt)
      actions.push({
        id: `followup-${row.opportunity.id}`,
        type: "overdue_followup" as const,
        title: "Fazer follow-up",
        subtitle: `${row.companyName} · Enviado ha ${days} dias`,
        urgency: days > 5 ? "high" as const : "medium" as const,
        opportunity: mapOpportunity(row),
      })
    }

    // 4. Oportunidades paradas
    for (const row of stale) {
      actions.push({
        id: `stale-${row.opportunity.id}`,
        type: "stale_opportunity" as const,
        title: "Essa candidatura precisa de atencao",
        subtitle: `${row.companyName} · Sem atividade ha ${daysSince(row.opportunity.updatedAt)} dias`,
        urgency: "low" as const,
        opportunity: mapOpportunity(row),
      })
    }

    return NextResponse.json({ data: actions })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
