import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { StatsCards } from "@/components/dashboard/admin/stats-cards"
import { TopicRanking } from "@/components/dashboard/admin/topic-ranking"

export default function AdminDashboardPage() {
  return (
    <>
      <DashboardHeader title="Visao Geral" description="Painel administrativo" />
      <div className="p-4 md:p-6 flex flex-col gap-6">
        <StatsCards />
        <TopicRanking />
      </div>
    </>
  )
}
