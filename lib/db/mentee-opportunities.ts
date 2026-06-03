import { and, desc, eq, gt, gte, isNull, lt, lte, ne, or, sql } from "drizzle-orm"
import {
  companies,
  db,
  opportunities,
  opportunityEvents,
  messageTemplates,
  jobs,
  profiles,
} from "@/lib/db"

// ---------------------------------------------------------------------------
// Listar oportunidades do mentorado (com nome da empresa)
// ---------------------------------------------------------------------------
export async function getOpportunitiesByProfileId(profileId: string) {
  return db
    .select({
      opportunity: opportunities,
      companyName: companies.name,
      companyLinkedinUrl: companies.linkedinUrl,
    })
    .from(opportunities)
    .innerJoin(companies, eq(opportunities.companyId, companies.id))
    .where(eq(opportunities.profileId, profileId))
    .orderBy(desc(opportunities.updatedAt))
}

// ---------------------------------------------------------------------------
// Detalhe de uma oportunidade (com empresa)
// ---------------------------------------------------------------------------
export async function getOpportunityById(opportunityId: string, profileId: string) {
  const [row] = await db
    .select({
      opportunity: opportunities,
      companyName: companies.name,
      companyLinkedinUrl: companies.linkedinUrl,
    })
    .from(opportunities)
    .innerJoin(companies, eq(opportunities.companyId, companies.id))
    .where(
      and(
        eq(opportunities.id, opportunityId),
        eq(opportunities.profileId, profileId),
      ),
    )
    .limit(1)
  return row || null
}

// ---------------------------------------------------------------------------
// Eventos/timeline de uma oportunidade
// ---------------------------------------------------------------------------
export async function getEventsByOpportunityId(
  opportunityId: string,
  limit = 50,
) {
  return db
    .select({
      event: opportunityEvents,
      authorName: profiles.fullName,
    })
    .from(opportunityEvents)
    .leftJoin(profiles, eq(opportunityEvents.authorId, profiles.id))
    .where(eq(opportunityEvents.opportunityId, opportunityId))
    .orderBy(desc(opportunityEvents.occurredAt))
    .limit(limit)
}

// ---------------------------------------------------------------------------
// Acoes de "Hoje" — priorizadas
// ---------------------------------------------------------------------------
export async function getTodayActions(profileId: string) {
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // 1. Entrevistas em <24h
  const interviewsSoon = await db
    .select({
      opportunity: opportunities,
      companyName: companies.name,
      companyLinkedinUrl: companies.linkedinUrl,
    })
    .from(opportunities)
    .innerJoin(companies, eq(opportunities.companyId, companies.id))
    .where(
      and(
        eq(opportunities.profileId, profileId),
        ne(opportunities.status, "finalized"),
        lte(opportunities.nextInterviewAt, in24h),
        gte(opportunities.nextInterviewAt, now),
      ),
    )
    .orderBy(opportunities.nextInterviewAt)

  // 2. Follow-ups vencidos
  const overdueFollowUps = await db
    .select({
      opportunity: opportunities,
      companyName: companies.name,
      companyLinkedinUrl: companies.linkedinUrl,
    })
    .from(opportunities)
    .innerJoin(companies, eq(opportunities.companyId, companies.id))
    .where(
      and(
        eq(opportunities.profileId, profileId),
        ne(opportunities.status, "finalized"),
        lte(opportunities.nextFollowUpAt, now),
      ),
    )
    .orderBy(opportunities.nextFollowUpAt)

  // 3. Propostas recebidas
  const offers = await db
    .select({
      opportunity: opportunities,
      companyName: companies.name,
      companyLinkedinUrl: companies.linkedinUrl,
    })
    .from(opportunities)
    .innerJoin(companies, eq(opportunities.companyId, companies.id))
    .where(
      and(
        eq(opportunities.profileId, profileId),
        eq(opportunities.status, "offer"),
      ),
    )

  // 4. Oportunidades paradas ha >7 dias
  const stale = await db
    .select({
      opportunity: opportunities,
      companyName: companies.name,
      companyLinkedinUrl: companies.linkedinUrl,
    })
    .from(opportunities)
    .innerJoin(companies, eq(opportunities.companyId, companies.id))
    .where(
      and(
        eq(opportunities.profileId, profileId),
        ne(opportunities.status, "finalized"),
        lt(opportunities.updatedAt, sevenDaysAgo),
      ),
    )
    .orderBy(opportunities.updatedAt)
    .limit(5)

  return { interviewsSoon, overdueFollowUps, offers, stale }
}

// ---------------------------------------------------------------------------
// Metricas semanais simples
// ---------------------------------------------------------------------------
export async function getWeeklyStats(profileId: string) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [stats] = await db
    .select({
      totalActive: sql<number>`count(*) filter (where ${opportunities.status} != 'finalized')`,
      applicationsSent: sql<number>`count(*) filter (where ${opportunities.status} != 'evaluating' and ${opportunities.status} != 'finalized')`,
      interviewsScheduled: sql<number>`count(*) filter (where ${opportunities.nextInterviewAt} is not null and ${opportunities.nextInterviewAt} > now())`,
      pendingActions: sql<number>`count(*) filter (where ${opportunities.updatedAt} < ${weekAgo} and ${opportunities.status} != 'finalized')`,
    })
    .from(opportunities)
    .where(eq(opportunities.profileId, profileId))

  return {
    total_active: Number(stats?.totalActive || 0),
    applications_sent: Number(stats?.applicationsSent || 0),
    interviews_scheduled: Number(stats?.interviewsScheduled || 0),
    responses_received: 0, // TODO: contar eventos de resposta na semana
    pending_actions: Number(stats?.pendingActions || 0),
  }
}

// ---------------------------------------------------------------------------
// Templates de mensagem ativos
// ---------------------------------------------------------------------------
export async function getActiveMessageTemplates() {
  return db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.isActive, true))
    .orderBy(messageTemplates.sortOrder)
}

// ---------------------------------------------------------------------------
// Vagas sugeridas (match simples por nivel)
// ---------------------------------------------------------------------------
export async function getSuggestedJobs(profileId: string) {
  const [profile] = await db
    .select({
      seniority: profiles.seniority,
      careerFocus: profiles.careerFocus,
    })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1)

  if (!profile) return []

  // Mapear seniority do profile -> level do job
  type JobLevel = "internship" | "junior" | "mid" | "senior"
  const levelMap: Record<string, JobLevel> = {
    junior: "junior",
    mid: "mid",
    senior: "senior",
    undefined: "junior",
  }
  const targetLevel: JobLevel = profile.seniority ? levelMap[profile.seniority] || "junior" : "junior"

  // Buscar vagas aprovadas que batem com o nivel
  const suggestedJobs = await db
    .select({
      job: jobs,
      alreadyTracked: sql<boolean>`exists(
        select 1 from ${opportunities}
        where ${opportunities.profileId} = ${profileId}
        and ${opportunities.url} = ${jobs.applicationUrl}
      )`,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "approved"),
        eq(jobs.level, targetLevel),
        or(
          isNull(jobs.expiresAt),
          gt(jobs.expiresAt, new Date()),
        ),
      ),
    )
    .orderBy(desc(jobs.createdAt))
    .limit(20)

  return suggestedJobs
}

// ---------------------------------------------------------------------------
// Buscar/criar empresa para o mentorado
// ---------------------------------------------------------------------------
export async function findOrCreateCompany(
  profileId: string,
  name: string,
  linkedinUrl?: string | null,
) {
  // Tentar encontrar empresa existente do mentorado com mesmo nome
  const [existing] = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.profileId, profileId),
        eq(companies.name, name),
      ),
    )
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(companies)
    .values({
      profileId,
      name,
      linkedinUrl: linkedinUrl || null,
    })
    .returning()

  return created
}
