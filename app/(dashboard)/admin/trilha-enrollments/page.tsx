import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { TrilhaEnrollmentsTable } from "@/components/dashboard/admin/trilha-enrollments-table"

export default function AdminTrilhaEnrollmentsPage() {
  return (
    <>
      <DashboardHeader
        title="Inscrições em Trilhas"
        description="Confirme inscrições e agende as fases de cada mentorado"
      />
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <TrilhaEnrollmentsTable />
      </div>
    </>
  )
}
