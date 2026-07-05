import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SprintsAdminPanel } from "@/components/dashboard/admin/sprints/sprints-admin-panel"

export default function MentorSprintsPage() {
  return (
    <>
      <DashboardHeader
        title="Sprints"
        description="Simulador de sprint: acompanhe mentorados, candidaturas e dúvidas"
      />
      <div className="p-4 md:p-6">
        <SprintsAdminPanel basePath="/mentor/sprints" />
      </div>
    </>
  )
}
