import { NextResponse } from "next/server"
import { requireRole } from "@/lib/utils/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import type { AdminStats } from "@/lib/types/database"

export async function GET() {
  try {
    await requireRole("admin")
    const supabase = createAdminClient()

    const [bookings, pendingBookings, mentees, pendingJobs, publishedContent, completedBookings] =
      await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "mentee"),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("content_items").select("id", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed"),
      ])

    const stats: AdminStats = {
      totalBookings: bookings.count || 0,
      pendingBookings: pendingBookings.count || 0,
      totalMentees: mentees.count || 0,
      pendingJobs: pendingJobs.count || 0,
      publishedContent: publishedContent.count || 0,
      completedBookings: completedBookings.count || 0,
    }

    return NextResponse.json({ data: stats })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
