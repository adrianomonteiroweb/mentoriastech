"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { AdsTable } from "@/components/dashboard/admin/ads-table"
import { AdForm } from "@/components/dashboard/admin/ad-form"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function AdminAdsPage() {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSuccess() {
    setShowForm(false)
    setRefreshKey((key) => key + 1)
  }

  return (
    <>
      <DashboardHeader title="Anúncios" description="Gerenciar serviços indicados na plataforma">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          {showForm ? "Fechar" : "Novo anúncio"}
        </Button>
      </DashboardHeader>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {showForm && (
          <div className="rounded-lg border p-4">
            <AdForm onSuccess={handleSuccess} />
          </div>
        )}
        <AdsTable refreshKey={refreshKey} />
      </div>
    </>
  )
}
