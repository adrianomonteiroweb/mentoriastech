import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { BookingsTable } from "@/components/dashboard/admin/bookings-table"

interface MentorBookingsPageProps {
  searchParams: Promise<{ booking_id?: string }>
}

export default async function MentorBookingsPage({ searchParams }: MentorBookingsPageProps) {
  const params = await searchParams

  return (
    <>
      <DashboardHeader title="Agendamentos" description="Gerenciar seus agendamentos de mentoria" />
      <div className="p-4 md:p-6">
        <BookingsTable bookingId={params.booking_id} />
      </div>
    </>
  )
}
