"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { TrilhaForm } from "@/components/dashboard/admin/trilha-form"
import { TrilhaTable } from "@/components/dashboard/admin/trilha-table"
import { Button } from "@/components/ui/button"

export default function AdminTrilhasPage() {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSuccess() {
    setShowForm(false)
    setRefreshKey((key) => key + 1)
  }

  return (
    <>
      <DashboardHeader
        title="Trilhas"
        description="Gerenciar trilhas de recolocação e seus conteúdos"
      >
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" />
          {showForm ? "Fechar" : "Nova trilha"}
        </Button>
      </DashboardHeader>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {showForm && (
          <div className="rounded-lg border p-4">
            <TrilhaForm onSuccess={handleSuccess} />
          </div>
        )}
        <TrilhaTable refreshKey={refreshKey} />
      </div>
    </>
  )
}
