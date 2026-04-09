import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MenteesTable } from "@/components/dashboard/admin/mentees-table"

export default function AdminMenteesPage() {
  return (
    <>
      <DashboardHeader title="Mentorados" description="Visualizar todos os mentorados cadastrados" />
      <div className="p-4 md:p-6">
        <MenteesTable />
      </div>
    </>
  )
}
