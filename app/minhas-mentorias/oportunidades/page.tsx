import { redirect } from "next/navigation"
import { OpportunitiesPanel } from "@/components/minhas-mentorias/opportunities/opportunities-panel"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { ensureProfileForMenteeEmail } from "@/lib/utils/mentee-resume"
import {
  getOpportunitiesByProfileId,
  getTodayActions,
  getWeeklyStats,
} from "@/lib/db/mentee-opportunities"

export const dynamic = "force-dynamic"

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function mapOpportunity(row: Awaited<ReturnType<typeof getOpportunitiesByProfileId>>[number]) {
  const o = row.opportunity
  return {
    id: o.id,
    profile_id: o.profileId,
    company_id: o.companyId,
    company_name: row.companyName,
    company_linkedin_url: row.companyLinkedinUrl,
    title: o.title,
    url: o.url,
    description: o.description,
    category: o.category,
    city: o.city,
    state: o.state,
    status: o.status as "evaluating" | "preparing_application" | "resume_sent" | "in_conversation" | "interviews" | "offer" | "finalized",
    finalization_type: o.finalizationType as "hired" | "rejected" | "no_response" | "frozen" | "candidate_withdrew" | null,
    priority: o.priority as "high" | "medium" | "low",
    work_model: o.workModel as "remote" | "hybrid" | "onsite" | null,
    job_level: o.jobLevel as "internship" | "junior" | "mid" | "senior" | "trainee" | null,
    salary_range: o.salaryRange,
    contact_name: o.contactName,
    contact_role: o.contactRole,
    contact_linkedin: o.contactLinkedin,
    interview_type: o.interviewType as "rh" | "technical" | "manager" | null,
    resume_id: o.resumeId,
    checklist: o.checklist,
    application_date: toIso(o.applicationDate),
    next_follow_up_at: toIso(o.nextFollowUpAt),
    next_interview_at: toIso(o.nextInterviewAt),
    created_at: toIso(o.createdAt) || "",
    updated_at: toIso(o.updatedAt) || "",
  }
}

function mapTodayAction(
  row: Awaited<ReturnType<typeof getTodayActions>>,
  key: "interviewsSoon" | "overdueFollowUps" | "offers" | "stale",
) {
  const typeMap = {
    interviewsSoon: "interview_soon",
    overdueFollowUps: "overdue_followup",
    offers: "offer_received",
    stale: "stale_opportunity",
  } as const

  const urgencyMap = {
    interviewsSoon: "critical",
    overdueFollowUps: "high",
    offers: "high",
    stale: "low",
  } as const

  const titleMap = {
    interviewsSoon: "Preparar entrevista",
    overdueFollowUps: "Fazer follow-up",
    offers: "Avaliar proposta",
    stale: "Essa candidatura precisa de atencao",
  }

  return row[key].map((r) => ({
    id: `${typeMap[key]}-${r.opportunity.id}`,
    type: typeMap[key],
    title: titleMap[key],
    subtitle: `${r.companyName} · ${r.opportunity.title || "Vaga"}`,
    urgency: urgencyMap[key],
    opportunity: mapOpportunity(r),
  }))
}

export default async function OpportunitiesPage() {
  const session = await getMenteeAccessSession()
  if (!session) redirect("/minhas-mentorias")

  const profile = await ensureProfileForMenteeEmail(session.email)

  const [opps, todayRaw, stats] = await Promise.all([
    getOpportunitiesByProfileId(profile.id),
    getTodayActions(profile.id),
    getWeeklyStats(profile.id),
  ])

  const opportunities = opps.map(mapOpportunity)

  const todayActions = [
    ...mapTodayAction(todayRaw, "interviewsSoon"),
    ...mapTodayAction(todayRaw, "offers"),
    ...mapTodayAction(todayRaw, "overdueFollowUps"),
    ...mapTodayAction(todayRaw, "stale"),
  ]

  return (
    <OpportunitiesPanel
      email={session.email}
      initialOpportunities={opportunities}
      initialTodayActions={todayActions}
      initialStats={stats}
    />
  )
}
