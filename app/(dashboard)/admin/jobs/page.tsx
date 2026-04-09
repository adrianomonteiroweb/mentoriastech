import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { JobsTable } from "@/components/dashboard/admin/jobs-table"

export default function AdminJobsPage() {
  return (
    <>
      <DashboardHeader title="Vagas" description="Aprovar ou rejeitar vagas publicadas" />
      <div className="p-4 md:p-6">
        <JobsTable />
      </div>
    </>
  )
}
