import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { BookingsTable } from "@/components/dashboard/admin/bookings-table"

export default function AdminBookingsPage() {
  return (
    <>
      <DashboardHeader title="Agendamentos" description="Gerenciar todos os agendamentos de mentoria" />
      <div className="p-4 md:p-6">
        <BookingsTable />
      </div>
    </>
  )
}
