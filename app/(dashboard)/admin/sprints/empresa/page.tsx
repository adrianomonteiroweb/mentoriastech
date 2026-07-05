import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { CompanyHub } from "@/components/dashboard/admin/sprints/company-hub"

export default function AdminSimCompaniesPage() {
  return (
    <>
      <DashboardHeader
        title="Empresas Fictícias"
        description="Contextos de sprint: produto, cliente, processo e docs da equipe"
      />
      <div className="p-4 md:p-6">
        <CompanyHub />
      </div>
    </>
  )
}
