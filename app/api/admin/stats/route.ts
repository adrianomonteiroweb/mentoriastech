import { NextResponse } from "next/server"
import { and, count, countDistinct, desc, eq, gte, inArray, sql } from "drizzle-orm"
import { requireMentorAccess, getMentorId } from "@/lib/utils/auth"
import {
  ads,
  auditLogs,
  bookings,
  contentItems,
  db,
  jobActions,
  jobs,
  mentoringTopics,
  pageEvents,
  pageShares,
  paidMentorships,
  payments,
} from "@/lib/db"
import type { AdminStats, MostRequestedMentorship, TopicRanking } from "@/lib/types/database"

function rate(numerator: number, denominator: number): number {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 1000) / 10 // 1 casa decimal
}

export async function GET(request: Request) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)

    const url = new URL(request.url)
    const filterMentorId = profile.role === "admin"
      ? url.searchParams.get("mentorId") || mentorId
      : mentorId

    const mentorFilter = eq(bookings.mentorId, filterMentorId)
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    // Limites de período no fuso de São Paulo (UTC-3, sem horário de verão), para que
    // "hoje/semana/mês" reflitam o dia civil do Brasil e não o do servidor (UTC).
    const SP_OFFSET_MS = 3 * 60 * 60 * 1000
    const DAY_MS = 24 * 60 * 60 * 1000
    const nowSp = new Date(Date.now() - SP_OFFSET_MS)
    const visitsDayStart = new Date(
      Date.UTC(nowSp.getUTCFullYear(), nowSp.getUTCMonth(), nowSp.getUTCDate()) + SP_OFFSET_MS,
    )
    // Semana começando na segunda-feira (0 = segunda ... 6 = domingo)
    const daysSinceMonday = (nowSp.getUTCDay() + 6) % 7
    const visitsWeekStart = new Date(visitsDayStart.getTime() - daysSinceMonday * DAY_MS)
    const visitsMonthStart = new Date(
      Date.UTC(nowSp.getUTCFullYear(), nowSp.getUTCMonth(), 1) + SP_OFFSET_MS,
    )

    const [
      totalBookings,
      pendingBookings,
      totalMentees,
      pendingJobs,
      publishedContent,
      completedBookings,
      reportedJobs,
      totalApplications,
      totalPageShares,
      totalContentShares,
      totalJobShares,
      resumeToolUses,
      linkedinToolUses,
      opportunityToolUses,
      resumeJobToolUses,
      adsAgg,
      paidAgg,
      monthlyRevenueAgg,
      totalRevenueAgg,
      newMenteesAgg,
      publicVisitsAgg,
      publicClicksAgg,
      visitsTodayAgg,
      visitsWeekAgg,
      visitsMonthAgg,
      mostRequestedPaidRows,
    ] = await Promise.all([
      db.select({ value: count() }).from(bookings).where(mentorFilter),
      db.select({ value: count() }).from(bookings).where(and(eq(bookings.status, "pending"), mentorFilter)),
      db.select({ value: countDistinct(bookings.menteeId) }).from(bookings).where(mentorFilter),
      db.select({ value: count() }).from(jobs).where(eq(jobs.status, "pending")),
      db.select({ value: count() }).from(contentItems).where(eq(contentItems.isPublished, true)),
      db.select({ value: count() }).from(bookings).where(and(eq(bookings.status, "completed"), mentorFilter)),
      db.select({ value: countDistinct(jobActions.jobId) }).from(jobActions).where(inArray(jobActions.actionType, ["link_issue", "closed"])),
      db.select({ value: count() }).from(jobActions).where(eq(jobActions.actionType, "applied")),
      db.select({ value: sql<number>`coalesce(sum(${pageShares.shareCount}), 0)::int` }).from(pageShares),
      db.select({ value: sql<number>`coalesce(sum(${contentItems.shareCount}), 0)::int` }).from(contentItems),
      db.select({ value: sql<number>`coalesce(sum(${jobs.shareCount}), 0)::int` }).from(jobs),
      db.select({ value: count() }).from(auditLogs).where(eq(auditLogs.action, "resume_ai_improved")),
      db.select({ value: count() }).from(auditLogs).where(eq(auditLogs.action, "linkedin_ai_analyzed")),
      db.select({ value: count() }).from(auditLogs).where(eq(auditLogs.action, "minhas_mentorias_opportunity_created")),
      db.select({ value: count() }).from(auditLogs).where(eq(auditLogs.action, "minhas_mentorias_resume_job_created")),
      // Conversão de anúncios (global)
      db.select({
        views: sql<number>`coalesce(sum(${ads.viewCount}), 0)::int`,
        clicks: sql<number>`coalesce(sum(${ads.clickCount}), 0)::int`,
      }).from(ads),
      // Conversão de mentorias pagas (global)
      db.select({
        views: sql<number>`coalesce(sum(${paidMentorships.viewCount}), 0)::int`,
        clicks: sql<number>`coalesce(sum(${paidMentorships.clickCount}), 0)::int`,
      }).from(paidMentorships),
      // Receita confirmada no mês atual
      db.select({ value: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
        .from(payments)
        .where(and(eq(payments.status, "confirmed"), gte(payments.paidAt, monthStart))),
      // Receita confirmada acumulada + nº de pagamentos
      db.select({
        total: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
        countConfirmed: count(),
      }).from(payments).where(eq(payments.status, "confirmed")),
      // Novos mentorados no mês (por primeiro agendamento criado no mês, filtrado por mentor)
      db.select({ value: countDistinct(bookings.menteeId) })
        .from(bookings)
        .where(and(mentorFilter, gte(bookings.createdAt, monthStart))),
      // Visitas na página pública
      db.select({ value: count() }).from(pageEvents).where(eq(pageEvents.eventType, "visit")),
      // Clicks na página pública
      db.select({ value: count() }).from(pageEvents).where(eq(pageEvents.eventType, "click")),
      // Visitas por período (fuso de São Paulo)
      db.select({ value: count() }).from(pageEvents)
        .where(and(eq(pageEvents.eventType, "visit"), gte(pageEvents.createdAt, visitsDayStart))),
      db.select({ value: count() }).from(pageEvents)
        .where(and(eq(pageEvents.eventType, "visit"), gte(pageEvents.createdAt, visitsWeekStart))),
      db.select({ value: count() }).from(pageEvents)
        .where(and(eq(pageEvents.eventType, "visit"), gte(pageEvents.createdAt, visitsMonthStart))),
      // Mentoria paga mais pedida (por nº de bookings)
      db.select({
        name: paidMentorships.title,
        bookingCount: count(bookings.id),
      })
        .from(paidMentorships)
        .leftJoin(bookings, eq(bookings.paidMentorshipId, paidMentorships.id))
        .groupBy(paidMentorships.id, paidMentorships.title)
        .orderBy(desc(count(bookings.id)))
        .limit(1),
    ])

    const pageSharesTotal = totalPageShares[0]?.value || 0
    const contentSharesTotal = totalContentShares[0]?.value || 0
    const jobSharesTotal = totalJobShares[0]?.value || 0
    const minhasMentoriasResumeToolUses = resumeToolUses[0]?.value || 0
    const minhasMentoriasLinkedinToolUses = linkedinToolUses[0]?.value || 0
    const minhasMentoriasOpportunityToolUses = opportunityToolUses[0]?.value || 0
    const minhasMentoriasResumeJobToolUses = resumeJobToolUses[0]?.value || 0

    const totalBookingsValue = totalBookings[0]?.value || 0
    const completedBookingsValue = completedBookings[0]?.value || 0
    const adsViews = adsAgg[0]?.views || 0
    const adsClicks = adsAgg[0]?.clicks || 0
    const paidViews = paidAgg[0]?.views || 0
    const paidClicks = paidAgg[0]?.clicks || 0
    const totalRevenueCents = totalRevenueAgg[0]?.total || 0
    const confirmedPaymentsCount = totalRevenueAgg[0]?.countConfirmed || 0
    const publicVisits = publicVisitsAgg[0]?.value || 0
    const publicClicks = publicClicksAgg[0]?.value || 0
    const visitsToday = visitsTodayAgg[0]?.value || 0
    const visitsThisWeek = visitsWeekAgg[0]?.value || 0
    const visitsThisMonth = visitsMonthAgg[0]?.value || 0

    const mostRequestedPaidRow = mostRequestedPaidRows[0]
    const mostRequestedPaid: MostRequestedMentorship | null =
      mostRequestedPaidRow && mostRequestedPaidRow.bookingCount > 0
        ? { name: mostRequestedPaidRow.name, count: mostRequestedPaidRow.bookingCount }
        : null

    const topicRankingRows = await db
      .select({
        topicId: mentoringTopics.id,
        topicName: mentoringTopics.name,
        category: mentoringTopics.category,
        bookingCount: count(bookings.id),
      })
      .from(mentoringTopics)
      .leftJoin(bookings, and(eq(bookings.topicId, mentoringTopics.id), mentorFilter))
      .where(and(eq(mentoringTopics.isActive, true), eq(mentoringTopics.mentorId, filterMentorId)))
      .groupBy(mentoringTopics.id, mentoringTopics.name, mentoringTopics.category)
      .orderBy(desc(count(bookings.id)))

    const topicRanking: TopicRanking[] = topicRankingRows.map((row) => ({
      topicId: row.topicId,
      topicName: row.topicName,
      category: row.category as "free" | "paid",
      bookingCount: row.bookingCount,
    }))

    const topFree = topicRanking.find((t) => t.category === "free" && t.bookingCount > 0)
    const mostRequestedFree: MostRequestedMentorship | null = topFree
      ? { name: topFree.topicName, count: topFree.bookingCount }
      : null

    const stats: AdminStats = {
      totalBookings: totalBookingsValue,
      pendingBookings: pendingBookings[0]?.value || 0,
      totalMentees: totalMentees[0]?.value || 0,
      pendingJobs: pendingJobs[0]?.value || 0,
      publishedContent: publishedContent[0]?.value || 0,
      completedBookings: completedBookingsValue,
      reportedJobs: reportedJobs[0]?.value || 0,
      totalApplications: totalApplications[0]?.value || 0,
      totalPageShares: pageSharesTotal,
      totalContentShares: contentSharesTotal,
      totalJobShares: jobSharesTotal,
      totalShares: pageSharesTotal + contentSharesTotal + jobSharesTotal,
      minhasMentoriasToolUses:
        minhasMentoriasResumeToolUses +
        minhasMentoriasLinkedinToolUses +
        minhasMentoriasOpportunityToolUses +
        minhasMentoriasResumeJobToolUses,
      minhasMentoriasResumeToolUses,
      minhasMentoriasLinkedinToolUses,
      minhasMentoriasOpportunityToolUses,
      minhasMentoriasResumeJobToolUses,
      adsConversionRate: rate(adsClicks, adsViews),
      paidConversionRate: rate(paidClicks, paidViews),
      monthlyPaidRevenueCents: monthlyRevenueAgg[0]?.value || 0,
      totalPaidRevenueCents: totalRevenueCents,
      avgTicketCents: confirmedPaymentsCount ? Math.round(totalRevenueCents / confirmedPaymentsCount) : 0,
      newMenteesThisMonth: newMenteesAgg[0]?.value || 0,
      completionRate: rate(completedBookingsValue, totalBookingsValue),
      publicVisits,
      publicClicks,
      publicConversionRate: rate(publicClicks, publicVisits),
      visitsToday,
      visitsThisWeek,
      visitsThisMonth,
      mostRequestedPaid,
      mostRequestedFree,
    }

    return NextResponse.json({ data: stats, topicRanking })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
