"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, Briefcase } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { JOB_LEVEL_LABELS, WORK_MODEL_LABELS } from "./constants"
import { useOpportunities } from "./opportunities-context"
import type { ApiSuggestedJob } from "./types"

function SuggestedJobCard({ job }: { job: ApiSuggestedJob }) {
  const { createOpportunity } = useOpportunities()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(job.already_tracked)

  async function handleAdd() {
    setAdding(true)
    try {
      await createOpportunity({
        company_name: job.company || "Empresa",
        company_linkedin_url: job.application_url || "",
        title: job.title,
        url: job.application_url || "",
        category: job.category,
        work_model: job.job_type,
        job_level: job.level,
      })
      setAdded(true)
    } catch {
      // context handles
    } finally {
      setAdding(false)
    }
  }

  return (
    <Card className={`transition-colors ${added ? "opacity-50" : "hover:border-primary/40"}`}>
      <CardContent className="flex flex-col gap-2 py-3 px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {job.title}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {job.company || "Empresa"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {WORK_MODEL_LABELS[job.job_type] || job.job_type}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {JOB_LEVEL_LABELS[job.level] || job.level}
          </Badge>
          {job.salary_range && (
            <Badge variant="outline" className="text-[10px]">
              {job.salary_range}
            </Badge>
          )}
        </div>

        {job.location && (
          <span className="text-[10px] text-muted-foreground">{job.location}</span>
        )}

        <Button
          size="sm"
          variant={added ? "ghost" : "default"}
          className="h-7 text-xs w-full"
          disabled={added || adding}
          onClick={handleAdd}
        >
          {adding ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : added ? (
            "Ja adicionada"
          ) : (
            <>
              <Plus className="h-3 w-3 mr-1" />
              Adicionar ao meu painel
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export function SuggestedJobsColumn({ variant }: { variant: "column" | "accordion" }) {
  const [jobs, setJobs] = useState<ApiSuggestedJob[]>([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/minhas-mentorias/opportunities/suggested-jobs")
      const json = await res.json()
      setJobs(json.data || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const untracked = jobs.filter((j) => !j.already_tracked)

  if (untracked.length === 0 && jobs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Briefcase className="h-6 w-6 text-muted-foreground/50" />
        <p className="text-[10px] text-muted-foreground">
          Nenhuma vaga sugerida no momento.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {jobs.map((job) => (
        <SuggestedJobCard key={job.id} job={job} />
      ))}
    </div>
  )
}
