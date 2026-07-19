"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { JobsTable } from "@/components/dashboard/admin/jobs-table"
import { CompanyFeedbacksTable } from "@/components/dashboard/admin/company-feedbacks-table"
import { JobForm } from "@/components/dashboard/hr/job-form"
import { Button } from "@/components/ui/button"
import { Flag, Plus } from "lucide-react"

export default function AdminJobsPage() {
  const [showForm, setShowForm] = useState(false)
  const [showFeedbacks, setShowFeedbacks] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleSuccess() {
    setShowForm(false)
    setRefreshKey((key) => key + 1)
  }

  return (
    <>
      <DashboardHeader title="Vagas" description="Cadastrar e gerenciar vagas publicadas">
        <div className="flex gap-2">
          <Button size="sm" variant={showFeedbacks ? "default" : "outline"} onClick={() => setShowFeedbacks(!showFeedbacks)}>
            <Flag className="h-4 w-4 mr-1" />
            {showFeedbacks ? "Ver vagas" : "Feedbacks"}
          </Button>
          {!showFeedbacks && (
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-1" />
              {showForm ? "Fechar" : "Nova vaga"}
            </Button>
          )}
        </div>
      </DashboardHeader>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {showFeedbacks ? (
          <CompanyFeedbacksTable />
        ) : (
          <>
            {showForm && (
              <div className="rounded-lg border p-4">
                <JobForm adminMode onSuccess={handleSuccess} />
              </div>
            )}
            <JobsTable showAll adminMode refreshKey={refreshKey} />
          </>
        )}
      </div>
    </>
  )
}
