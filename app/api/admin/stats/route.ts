import { NextResponse } from "next/server"
import { count, countDistinct, desc, eq, inArray, sql } from "drizzle-orm"
import { requireRole } from "@/lib/utils/auth"
import { bookings, contentItems, db, jobActions, jobs, mentoringTopics, pageShares, profiles } from "@/lib/db"
import type { AdminStats, TopicRanking } from "@/lib/types/database"

export async function GET() {
  try {
    await requireRole("admin")

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
    ] = await Promise.all([
      db.select({ value: count() }).from(bookings),
      db.select({ value: count() }).from(bookings).where(eq(bookings.status, "pending")),
      db.select({ value: count() }).from(profiles).where(eq(profiles.role, "mentee")),
      db.select({ value: count() }).from(jobs).where(eq(jobs.status, "pending")),
      db.select({ value: count() }).from(contentItems).where(eq(contentItems.isPublished, true)),
      db.select({ value: count() }).from(bookings).where(eq(bookings.status, "completed")),
      db.select({ value: countDistinct(jobActions.jobId) }).from(jobActions).where(inArray(jobActions.actionType, ["link_issue", "closed"])),
      db.select({ value: count() }).from(jobActions).where(eq(jobActions.actionType, "applied")),
      db.select({ value: sql<number>`coalesce(sum(${pageShares.shareCount}), 0)::int` }).from(pageShares),
      db.select({ value: sql<number>`coalesce(sum(${contentItems.shareCount}), 0)::int` }).from(contentItems),
      db.select({ value: sql<number>`coalesce(sum(${jobs.shareCount}), 0)::int` }).from(jobs),
    ])

    const pageSharesTotal = totalPageShares[0]?.value || 0
    const contentSharesTotal = totalContentShares[0]?.value || 0
    const jobSharesTotal = totalJobShares[0]?.value || 0

    const topicRankingRows = await db
      .select({
        topicId: mentoringTopics.id,
        topicName: mentoringTopics.name,
        category: mentoringTopics.category,
        bookingCount: count(bookings.id),
      })
      .from(mentoringTopics)
      .leftJoin(bookings, eq(bookings.topicId, mentoringTopics.id))
      .where(eq(mentoringTopics.isActive, true))
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
    }

    return NextResponse.json({ data: stats, topicRanking })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
