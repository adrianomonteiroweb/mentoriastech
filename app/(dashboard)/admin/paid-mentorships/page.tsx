"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { PaidMentorshipForm } from "@/components/dashboard/admin/paid-mentorship-form"
import { PaidMentorshipsTable } from "@/components/dashboard/admin/paid-mentorships-table"
import { Button } from "@/components/ui/button"

export default function AdminPaidMentorshipsPage() {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSuccess() {
    setShowForm(false)
    setRefreshKey((current) => current + 1)
  }

  return (
    <>
      <DashboardHeader title="Mentorias pagas" description="Criar ofertas com Pix via Stripe">
        <Button size="sm" onClick={() => setShowForm((current) => !current)}>
          <Plus className="mr-1 h-4 w-4" />
          {showForm ? "Fechar" : "Nova mentoria"}
        </Button>
      </DashboardHeader>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {showForm && (
          <div className="rounded-lg border p-4">
            <PaidMentorshipForm onSuccess={handleSuccess} />
          </div>
        )}
        <PaidMentorshipsTable refreshKey={refreshKey} />
      </div>
    </>
  )
}
