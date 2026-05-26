import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { AgendaCalendar } from "@/components/dashboard/admin/agenda-calendar"

export default function AdminSchedulePage() {
  return (
    <>
      <DashboardHeader title="Agenda" description="Visualizar mentorias em formato de calendario" />
      <AgendaCalendar />
    </>
  )
}
