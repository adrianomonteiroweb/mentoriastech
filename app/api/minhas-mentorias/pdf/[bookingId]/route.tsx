import { renderToBuffer } from "@react-pdf/renderer"
import { NextResponse } from "next/server"
import { getMenteeBookingByIdForEmail } from "@/lib/db/mentee-bookings"
import { MentorshipPDF } from "@/lib/pdf/mentorship-pdf"
import { getMenteeAccessSession } from "@/lib/utils/mentee-access"

interface RouteContext {
  params: Promise<{ bookingId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getMenteeAccessSession()
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { bookingId } = await context.params

  const booking = await getMenteeBookingByIdForEmail(bookingId, session.email)
  if (!booking) {
    return NextResponse.json({ error: "Mentoria não encontrada" }, { status: 404 })
  }

  if (booking.status !== "completed") {
    return NextResponse.json(
      { error: "Esta mentoria ainda não foi concluída" },
      { status: 400 },
    )
  }

  const buffer = await renderToBuffer(
    <MentorshipPDF booking={booking} menteeEmail={session.email} />,
  )

  const filename = `mentoria-${booking.sessionDate || "sem-data"}.pdf`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
