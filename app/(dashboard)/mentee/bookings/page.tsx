import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { BookingHistory } from "@/components/dashboard/mentee/booking-history"
import { DonateWidget } from "@/components/donate-widget"

export default function MenteeBookingsPage() {
  return (
    <>
      <DashboardHeader title="Agendamentos" description="Historico de mentorias" />
      <div className="p-4 md:p-6">
        <BookingHistory />
      </div>
      <div className="p-4 md:p-6">
        <DonateWidget />
      </div>
    </>
  )
}
