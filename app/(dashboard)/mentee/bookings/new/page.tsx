import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { UnifiedBookingForm } from "@/components/booking/unified-booking-form"

export default function NewBookingPage() {
  return (
    <>
      <DashboardHeader title="Nova Mentoria" description="Solicitar mentoria gratuita" />
      <div className="flex flex-col gap-8 p-4 md:p-6">
        <div className="max-w-md">
          <UnifiedBookingForm />
        </div>
      </div>
    </>
  )
}
