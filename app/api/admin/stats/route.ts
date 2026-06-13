import { NextResponse } from "next/server"
import { and, count, countDistinct, desc, eq, inArray, sql } from "drizzle-orm"
import { requireMentorAccess, getMentorId } from "@/lib/utils/auth"
import {
  auditLogs,
  bookings,
  contentItems,
  db,
  jobActions,
  jobs,
  mentoringTopics,
  pageShares,
  profiles,
} from "@/lib/db"
import type { AdminStats, TopicRanking } from "@/lib/types/database"

export async function GET(request: Request) {
  try {
    const profile = await requireMentorAccess()
    const mentorId = getMentorId(profile)

    const url = new URL(request.url)
    const filterMentorId = profile.role === "admin"
      ? url.searchParams.get("mentorId") || mentorId
      : mentorId

    const mentorFilter = eq(bookings.mentorId, filterMentorId)

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
    ])

    const pageSharesTotal = totalPageShares[0]?.value || 0
    const contentSharesTotal = totalContentShares[0]?.value || 0
    const jobSharesTotal = totalJobShares[0]?.value || 0
    const minhasMentoriasResumeToolUses = resumeToolUses[0]?.value || 0
    const minhasMentoriasLinkedinToolUses = linkedinToolUses[0]?.value || 0
    const minhasMentoriasOpportunityToolUses = opportunityToolUses[0]?.value || 0
    const minhasMentoriasResumeJobToolUses = resumeJobToolUses[0]?.value || 0

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

    const stats: AdminStats = {
      totalBookings: totalBookings[0]?.value || 0,
      pendingBookings: pendingBookings[0]?.value || 0,
      totalMentees: totalMentees[0]?.value || 0,
      pendingJobs: pendingJobs[0]?.value || 0,
      publishedContent: publishedContent[0]?.value || 0,
      completedBookings: completedBookings[0]?.value || 0,
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
    }

    return NextResponse.json({ data: stats, topicRanking })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
