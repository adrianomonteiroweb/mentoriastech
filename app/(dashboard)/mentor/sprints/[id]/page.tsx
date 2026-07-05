import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SprintDetailAdmin } from "@/components/dashboard/admin/sprints/sprint-detail-admin"

export default async function MentorSprintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <>
      <DashboardHeader
        title="Detalhe da Sprint"
        description="Quadro, daily e pontuação do mentorado"
      />
      <div className="p-4 md:p-6">
        <SprintDetailAdmin sprintId={id} basePath="/mentor/sprints" />
      </div>
    </>
  )
}
