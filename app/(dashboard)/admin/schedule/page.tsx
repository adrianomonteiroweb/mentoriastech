import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SlotsTable } from "@/components/dashboard/admin/slots-table"
import { TopicsTable } from "@/components/dashboard/admin/topics-table"

export default function AdminSchedulePage() {
  return (
    <>
      <DashboardHeader title="Agenda" description="Gerenciar horarios e temas de mentoria" />
      <div className="flex flex-col gap-8 p-4 md:p-6">
        <SlotsTable />
        <TopicsTable />
      </div>
    </>
  )
}
