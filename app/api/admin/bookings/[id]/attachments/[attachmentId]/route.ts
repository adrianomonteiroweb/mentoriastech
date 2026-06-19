import { NextResponse } from "next/server"
import { requireMentorAccess, AuthError } from "@/lib/utils/auth"
import { getAttachmentById, deleteAttachment } from "@/lib/db/booking-attachments"
import { deleteFile } from "@/lib/utils/upload"

interface RouteContext {
  params: Promise<{ id: string; attachmentId: string }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await requireMentorAccess()
    const { id: bookingId, attachmentId } = await context.params

    const attachment = await getAttachmentById(attachmentId)
    if (!attachment || attachment.bookingId !== bookingId) {
      return NextResponse.json({ error: "Anexo nao encontrado" }, { status: 404 })
    }

    if (attachment.fileUrl) {
      await deleteFile(attachment.fileUrl)
    }

    await deleteAttachment(attachmentId)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[bookings/attachments] DELETE error:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
