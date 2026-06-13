import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { TopicsTable } from "@/components/dashboard/admin/topics-table"

export default function MentorTopicsPage() {
  return (
    <>
      <DashboardHeader title="Temas" description="Gerenciar seus temas de mentoria" />
      <div className="p-4 md:p-6">
        <TopicsTable />
      </div>
    </>
  )
}
