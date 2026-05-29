"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ContentTable } from "@/components/dashboard/admin/content-table"
import { ContentForm } from "@/components/dashboard/admin/content-form"
import { ContentSuggestions } from "@/components/dashboard/admin/content-suggestions"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function AdminContentPage() {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSuccess() {
    setShowForm(false)
    setRefreshKey((key) => key + 1)
  }

  return (
    <>
      <DashboardHeader title="Conteudos" description="Gerenciar biblioteca de conteudos">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          {showForm ? "Fechar" : "Novo conteudo"}
        </Button>
      </DashboardHeader>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {showForm && (
          <div className="rounded-lg border p-4">
            <ContentForm onSuccess={handleSuccess} />
          </div>
        )}
        <ContentSuggestions />
        <ContentTable refreshKey={refreshKey} />
      </div>
    </>
  )
}
