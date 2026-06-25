import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardContent } from "@/components/dashboard/admin/dashboard-content"

export default function AdminDashboardPage() {
  return (
    <>
      <DashboardHeader title="Visao Geral" description="Painel administrativo" />
      <div className="p-4 md:p-6">
        <DashboardContent />
      </div>
    </>
  )
}
