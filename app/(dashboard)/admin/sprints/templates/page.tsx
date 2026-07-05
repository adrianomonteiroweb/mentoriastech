import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { TemplatesManager } from "@/components/dashboard/admin/sprints/templates-manager"

export default function AdminSimTemplatesPage() {
  return (
    <>
      <DashboardHeader
        title="Vagas & Templates"
        description="Templates de sprint publicados como vagas para os mentorados"
      />
      <div className="p-4 md:p-6">
        <TemplatesManager />
      </div>
    </>
  )
}
