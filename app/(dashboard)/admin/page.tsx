import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatsCards } from "@/components/dashboard/admin/stats-cards"

export default function AdminDashboardPage() {
  return (
    <>
      <DashboardHeader title="Visao Geral" description="Painel administrativo" />
      <div className="p-4 md:p-6">
        <StatsCards />
      </div>
    </>
  )
}
