import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MentorshipRequestTabs } from "@/components/booking/mentorship-request-tabs"

export default function NewBookingPage() {
  return (
    <>
      <DashboardHeader title="Nova Mentoria" description="Solicitar mentoria gratuita ou paga" />
      <div className="flex flex-col gap-8 p-4 md:p-6">
        <div className="max-w-2xl">
          <MentorshipRequestTabs />
        </div>
      </div>
    </>
  )
}
