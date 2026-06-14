"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SelectionProcessesTable } from "@/components/dashboard/admin/selection-processes-table"
import { SelectionProcessForm } from "@/components/dashboard/admin/selection-process-form"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function AdminSelectionProcessesPage() {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSuccess() {
    setShowForm(false)
    setRefreshKey((key) => key + 1)
  }

  return (
    <>
      <DashboardHeader title="Processos Seletivos" description="Gerencie processos seletivos por empresa e posicao">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          {showForm ? "Fechar" : "Novo processo"}
        </Button>
      </DashboardHeader>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {showForm && (
          <div className="rounded-lg border p-4">
            <SelectionProcessForm onSuccess={handleSuccess} />
          </div>
        )}
        <SelectionProcessesTable refreshKey={refreshKey} />
      </div>
    </>
  )
}
