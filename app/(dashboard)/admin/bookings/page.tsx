import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { BookingsTable } from "@/components/dashboard/admin/bookings-table"

interface AdminBookingsPageProps {
  searchParams: Promise<{ booking_id?: string }>
}

export default async function AdminBookingsPage({ searchParams }: AdminBookingsPageProps) {
  const params = await searchParams

  return (
    <>
      <DashboardHeader title="Agendamentos" description="Gerenciar todos os agendamentos de mentoria" />
      <div className="p-4 md:p-6">
        <BookingsTable bookingId={params.booking_id} />
      </div>
    </>
  )
}
