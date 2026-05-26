"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { TipForm } from "@/components/dashboard/admin/tip-form"
import { TipsTable } from "@/components/dashboard/admin/tips-table"
import { Button } from "@/components/ui/button"

export default function AdminTipsPage() {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSuccess() {
    setShowForm(false)
    setRefreshKey((key) => key + 1)
  }

  return (
    <>
      <DashboardHeader title="Dicas" description="Gerenciar dicas exibidas nas telas públicas">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Fechar" : "Nova dica"}
        </Button>
      </DashboardHeader>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {showForm && (
          <div className="rounded-lg border p-4">
            <TipForm onSuccess={handleSuccess} />
          </div>
        )}
        <TipsTable refreshKey={refreshKey} />
      </div>
    </>
  )
}
