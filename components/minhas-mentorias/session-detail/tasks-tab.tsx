"use client"

import { BookingTasksView } from "@/components/minhas-mentorias/booking-tasks-view"

interface TasksTabProps {
  bookingId: string
}

export function TasksTab({ bookingId }: TasksTabProps) {
  return <BookingTasksView bookingId={bookingId} />
}
