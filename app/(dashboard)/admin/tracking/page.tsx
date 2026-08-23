"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { TrackingLinksTable } from "@/components/dashboard/admin/tracking-links-table"
import { TrackingLinkForm } from "@/components/dashboard/admin/tracking-link-form"
import { TrackingAnalytics } from "@/components/dashboard/admin/tracking-analytics"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function AdminTrackingPage() {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSuccess() {
    setShowForm(false)
    setRefreshKey((key) => key + 1)
  }

  return (
    <>
      <DashboardHeader title="Links de Rastreamento" description="Rastreie trafego de campanhas e fontes externas">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          {showForm ? "Fechar" : "Novo link"}
        </Button>
      </DashboardHeader>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <TrackingAnalytics refreshKey={refreshKey} />
        {showForm && (
          <div className="rounded-lg border p-4">
            <TrackingLinkForm onSuccess={handleSuccess} />
          </div>
        )}
        <TrackingLinksTable refreshKey={refreshKey} onRefresh={() => setRefreshKey((k) => k + 1)} />
      </div>
    </>
  )
}
