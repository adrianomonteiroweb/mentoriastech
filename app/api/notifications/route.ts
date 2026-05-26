import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { bookings, db, jobs, mentoringTopics, profiles } from "@/lib/db"
import { bookingSelect } from "@/lib/db/booking-select"
import { getProfile } from "@/lib/utils/auth"

export async function GET() {
  try {
    const profile = await getProfile()

    if (!profile) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
    }

    if (profile.role !== "admin") {
      return NextResponse.json({ data: [], count: 0 })
    }

    const [pendingBookings, pendingJobs] = await Promise.all([
      db
        .select({
          booking: bookingSelect,
          topic: mentoringTopics,
          mentee: profiles,
        })
        .from(bookings)
        .leftJoin(mentoringTopics, eq(bookings.topicId, mentoringTopics.id))
        .leftJoin(profiles, eq(bookings.menteeId, profiles.id))
        .where(eq(bookings.status, "pending"))
        .orderBy(desc(bookings.createdAt))
        .limit(5),
      db
        .select({ job: jobs, author: profiles })
        .from(jobs)
        .leftJoin(profiles, eq(jobs.postedBy, profiles.id))
        .where(eq(jobs.status, "pending"))
        .orderBy(desc(jobs.createdAt))
        .limit(5),
    ])

    const bookingNotifications = pendingBookings.map(({ booking, topic, mentee }) => ({
      id: `booking-${booking.id}`,
      title: "Nova mentoria solicitada",
      description: `${booking.guestName || mentee?.fullName || "Mentorado"} quer conversar sobre ${topic?.name || "mentoria"}.`,
      href: "/admin/bookings",
      created_at: booking.createdAt,
    }))

    const jobNotifications = pendingJobs.map(({ job, author }) => ({
      id: `job-${job.id}`,
      title: "Vaga aguardando aprovacao",
      description: `${job.title} em ${job.company}${author?.fullName ? `, enviada por ${author.fullName}` : ""}.`,
      href: "/admin/jobs",
      created_at: job.createdAt,
    }))

    const data = [...bookingNotifications, ...jobNotifications]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)

    return NextResponse.json({ data, count: data.length })
  } catch (error) {
    const status = (error as { status?: number }).status || 500
    const message = (error as Error).message || "Erro interno"
    return NextResponse.json({ error: message }, { status })
  }
}
