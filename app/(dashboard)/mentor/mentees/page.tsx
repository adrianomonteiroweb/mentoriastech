import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MenteesTable } from "@/components/dashboard/admin/mentees-table"

export default function MentorMenteesPage() {
  return (
    <>
      <DashboardHeader title="Mentorados" description="Visualizar seus mentorados" />
      <div className="p-4 md:p-6">
        <MenteesTable canManage showSelectionProcesses={false} />
      </div>
    </>
  )
}
