"use client"

import { BookingAttachmentsView } from "@/components/minhas-mentorias/booking-attachments-view"

interface DocumentsTabProps {
  bookingId: string
}

export function DocumentsTab({ bookingId }: DocumentsTabProps) {
  return <BookingAttachmentsView bookingId={bookingId} />
}
