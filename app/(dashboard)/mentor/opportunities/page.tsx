import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MenteeOpportunitiesView } from "@/components/dashboard/admin/mentee-opportunities-view"

export default function MentorOpportunitiesPage() {
  return (
    <>
      <DashboardHeader
        title="Oportunidades"
        description="Acompanhe as candidaturas dos seus mentorados"
      />
      <div className="p-4 md:p-6">
        <MenteeOpportunitiesView />
      </div>
    </>
  )
}
