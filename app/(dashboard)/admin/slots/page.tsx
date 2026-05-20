import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SlotsTable } from "@/components/dashboard/admin/slots-table"

export default function AdminSlotsPage() {
  return (
    <>
      <DashboardHeader title="Horarios" description="Gerenciar horarios de mentoria" />
      <div className="p-4 md:p-6">
        <SlotsTable />
      </div>
    </>
  )
}
