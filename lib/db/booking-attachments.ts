import { desc, eq } from "drizzle-orm"
import { db, bookingAttachments } from "@/lib/db"

export async function getAttachmentsByBookingId(bookingId: string) {
  return db
    .select()
    .from(bookingAttachments)
    .where(eq(bookingAttachments.bookingId, bookingId))
    .orderBy(desc(bookingAttachments.createdAt))
}

export async function getAttachmentById(attachmentId: string) {
  const [row] = await db
    .select()
    .from(bookingAttachments)
    .where(eq(bookingAttachments.id, attachmentId))
    .limit(1)
  return row ?? null
}

export async function createAttachment(data: {
  bookingId: string
  uploadedBy: string
  type: "file" | "note" | "audio"
  title: string
  content?: string | null
  fileUrl?: string | null
  fileName?: string | null
  fileSizeBytes?: number | null
  mimeType?: string | null
  durationSeconds?: number | null
}) {
  const [row] = await db
    .insert(bookingAttachments)
    .values(data)
    .returning()
  return row
}

export async function deleteAttachment(attachmentId: string) {
  const [row] = await db
    .delete(bookingAttachments)
    .where(eq(bookingAttachments.id, attachmentId))
    .returning({ id: bookingAttachments.id, fileUrl: bookingAttachments.fileUrl })
  return row ?? null
}
