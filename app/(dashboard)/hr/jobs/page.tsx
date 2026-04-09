import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { JobsTable } from "@/components/dashboard/admin/jobs-table"

export default function HrJobsPage() {
  return (
    <>
      <DashboardHeader title="Minhas Vagas" description="Vagas publicadas por voce" />
      <div className="p-4 md:p-6">
        <JobsTable showAll />
      </div>
    </>
  )
}
