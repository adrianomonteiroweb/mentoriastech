import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { UnifiedBookingForm } from "@/components/booking/unified-booking-form"

export default function NewPaidBookingPage() {
  return (
    <>
      <DashboardHeader title="Nova Mentoria" description="Solicitar mentoria paga ou particular" />
      <div className="flex flex-col gap-8 p-4 md:p-6">
        <div className="max-w-md">
          <UnifiedBookingForm defaultType="paid" />
        </div>
      </div>
    </>
  )
}
