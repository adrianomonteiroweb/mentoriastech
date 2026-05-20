import { NextResponse } from "next/server"
import { count, eq } from "drizzle-orm"
import { requireRole } from "@/lib/utils/auth"
import { bookings, contentItems, db, jobs, profiles } from "@/lib/db"
import type { AdminStats } from "@/lib/types/database"

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
    ] = await Promise.all([
      db.select({ value: count() }).from(bookings),
      db.select({ value: count() }).from(bookings).where(eq(bookings.status, "pending")),
      db.select({ value: count() }).from(profiles).where(eq(profiles.role, "mentee")),
      db.select({ value: count() }).from(jobs).where(eq(jobs.status, "pending")),
      db.select({ value: count() }).from(contentItems).where(eq(contentItems.isPublished, true)),
      db.select({ value: count() }).from(bookings).where(eq(bookings.status, "completed")),
    ])

    const stats: AdminStats = {
      totalBookings: totalBookings[0]?.value || 0,
      pendingBookings: pendingBookings[0]?.value || 0,
      totalMentees: totalMentees[0]?.value || 0,
      pendingJobs: pendingJobs[0]?.value || 0,
      publishedContent: publishedContent[0]?.value || 0,
      completedBookings: completedBookings[0]?.value || 0,
    }

    return NextResponse.json({ data: stats })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
