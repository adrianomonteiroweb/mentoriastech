import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { JobAlertsTable } from "@/components/dashboard/admin/job-alerts-table"

export default function AdminJobAlertsPage() {
  return (
    <>
      <DashboardHeader
        title="Receber Vagas"
        description="Mentorados inscritos para receber vagas no WhatsApp"
      />
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <JobAlertsTable />
      </div>
    </>
  )
}
