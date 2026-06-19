import { NextResponse } from "next/server"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"
import { getMenteeBookingByIdForEmail } from "@/lib/db/mentee-bookings"
import { getAttachmentsByBookingId } from "@/lib/db/booking-attachments"

interface RouteContext {
  params: Promise<{ bookingId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getMenteeAccessSession()
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
  }

  const { bookingId } = await context.params

  const booking = await getMenteeBookingByIdForEmail(bookingId, session.email)
  if (!booking) {
    return NextResponse.json({ error: "Mentoria nao encontrada" }, { status: 404 })
  }

  const attachments = await getAttachmentsByBookingId(bookingId)

  return NextResponse.json({ data: attachments })
}
