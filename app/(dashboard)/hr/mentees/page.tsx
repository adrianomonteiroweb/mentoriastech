import { Suspense } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MenteesTable } from "@/components/dashboard/admin/mentees-table"

export default function HrMenteesPage() {
  return (
    <>
      <DashboardHeader title="Mentorados" description="Buscar mentorados e ver historico" />
      <div className="p-4 md:p-6">
        <Suspense>
          <MenteesTable />
        </Suspense>
      </div>
    </>
  )
}
