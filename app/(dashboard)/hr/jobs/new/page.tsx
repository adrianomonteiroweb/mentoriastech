import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { JobForm } from "@/components/dashboard/hr/job-form"

export default function HrNewJobPage() {
  return (
    <>
      <DashboardHeader title="Nova Vaga" description="Publicar uma nova oportunidade" />
      <div className="p-4 md:p-6">
        <JobForm />
      </div>
    </>
  )
}
