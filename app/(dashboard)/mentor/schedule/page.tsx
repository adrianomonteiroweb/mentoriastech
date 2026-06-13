import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { AgendaCalendar } from "@/components/dashboard/admin/agenda-calendar"

export default function MentorSchedulePage() {
  return (
    <>
      <DashboardHeader title="Agenda" description="Visualizar suas mentorias em formato de calendario" />
      <AgendaCalendar />
    </>
  )
}
