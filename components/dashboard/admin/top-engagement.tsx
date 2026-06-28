"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Briefcase, Eye, FileText, MousePointerClick } from "lucide-react"
import type { TopContent, TopJob } from "@/lib/types/database"
import { useMentorFilter } from "@/components/dashboard/admin/mentor-filter"

const RANK_BAR = [
  "bg-yellow-400",
  "bg-gray-300",
  "bg-amber-600",
] as const

function rankBar(index: number) {
  return index < 3 ? RANK_BAR[index] : "bg-primary/50"
}

function RankSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  )
}

export function TopEngagement() {
  const [topJobs, setTopJobs] = useState<TopJob[]>([])
  const [topContent, setTopContent] = useState<TopContent[]>([])
  const [loading, setLoading] = useState(true)
  const { mentorId, buildUrl } = useMentorFilter()

  useEffect(() => {
    setLoading(true)
    fetch(buildUrl("/api/admin/stats"))
      .then((r) => r.json())
      .then((json) => {
        setTopJobs(json.topJobs || [])
        setTopContent(json.topContentToday || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorId])

  const maxJob =
    topJobs.length > 0 ? topJobs[0].views + topJobs[0].clicks : 0
  const maxContent = topContent.length > 0 ? topContent[0].views : 0

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Briefcase className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Vagas mais vistas e clicadas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <RankSkeleton />
          ) : topJobs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Ainda sem visualizações ou cliques em vagas
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {topJobs.map((job, index) => {
                const total = job.views + job.clicks
                const barWidth = maxJob > 0 ? (total / maxJob) * 100 : 0
                return (
                  <div key={job.id} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {job.title}
                        {job.company && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {job.company}
                          </span>
                        )}
                      </p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all ${rankBar(index)}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {job.views}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MousePointerClick className="h-3 w-3" />
                        {job.clicks}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Conteúdos mais vistos hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <RankSkeleton />
          ) : topContent.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma visualização de conteúdo hoje
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {topContent.map((item, index) => {
                const barWidth = maxContent > 0 ? (item.views / maxContent) * 100 : 0
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{item.title}</p>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all ${rankBar(index)}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                      <Eye className="h-3 w-3" />
                      {item.views}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
