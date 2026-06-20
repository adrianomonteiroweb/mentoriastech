import { redirect, notFound } from "next/navigation"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { getMenteeBookingByIdForEmail } from "@/lib/db/mentee-bookings"
import { SessionDetailClient } from "./session-detail-client"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SessionDetailPage({ params }: PageProps) {
  const session = await getMenteeAccessSession()
  if (!session) {
    redirect("/minhas-mentorias")
  }

  const { id } = await params
  const booking = await getMenteeBookingByIdForEmail(id, session.email)

  if (!booking) {
    notFound()
  }

  return <SessionDetailClient email={session.email} booking={booking} />
}
