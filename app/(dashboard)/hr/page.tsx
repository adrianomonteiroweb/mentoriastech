import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { JobsTable } from "@/components/dashboard/admin/jobs-table"

export default function HrDashboardPage() {
  return (
    <>
      <DashboardHeader title="Visao Geral" description="Painel RH" />
      <div className="p-4 md:p-6">
        <JobsTable showAll />
      </div>
    </>
  )
}
