import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { BookingHistory } from "@/components/dashboard/mentee/booking-history"

export default function MenteeDashboardPage() {
  return (
    <>
      <DashboardHeader title="Visao Geral" description="Seus agendamentos recentes" />
      <div className="p-4 md:p-6">
        <BookingHistory />
      </div>
    </>
  )
}
