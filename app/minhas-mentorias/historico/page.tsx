import { redirect } from "next/navigation"
import { getAllMenteeBookingsByEmail } from "@/lib/db/mentee-bookings"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { MentoriasHistory } from "@/components/minhas-mentorias/mentorias-history"

export const dynamic = "force-dynamic"

export default async function HistoricoPage() {
  const session = await getMenteeAccessSession()

  if (!session) {
    redirect("/minhas-mentorias")
  }

  const bookings = await getAllMenteeBookingsByEmail(session.email)

  return <MentoriasHistory email={session.email} bookings={bookings} />
}
