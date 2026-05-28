"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Trophy,
  Code2,
  FileText,
  Briefcase,
  GraduationCap,
  Lightbulb,
  Target,
  Users,
  Brain,
  Rocket,
  Sparkles,
  Compass,
  BookOpen,
  PenTool,
  BarChart3,
  Shield,
  Cpu,
  Globe,
  Layers,
  Zap,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { TopicRanking as TopicRankingType } from "@/lib/types/database"

const TOPIC_ICONS: LucideIcon[] = [
  Code2, Briefcase, Brain, Target, Rocket, Lightbulb,
  GraduationCap, FileText, Users, Sparkles, Compass,
  BookOpen, PenTool, BarChart3, Shield, Cpu, Globe,
  Layers, Zap,
]

const RANK_COLORS = [
  "text-yellow-400",
  "text-gray-300",
  "text-amber-600",
]

function getIconForTopic(index: number): LucideIcon {
  return TOPIC_ICONS[index % TOPIC_ICONS.length]
}

export function TopicRanking() {
  const [topics, setTopics] = useState<TopicRankingType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((json) => setTopics(json.topicRanking || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const maxCount = topics.length > 0 ? topics[0].bookingCount : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <Trophy className="h-5 w-5 text-yellow-400" />
        <CardTitle className="text-base">Ranking de Temas</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        ) : topics.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum tema cadastrado
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {topics.map((topic, index) => {
              const Icon = getIconForTopic(index)
              const barWidth = maxCount > 0 ? (topic.bookingCount / maxCount) * 100 : 0
              const rankColor = index < 3 ? RANK_COLORS[index] : "text-muted-foreground"

              return (
                <div key={topic.topicId} className="flex items-center gap-3">
                  <span className={`w-5 text-center text-xs font-bold ${rankColor}`}>
                    {index + 1}
                  </span>
                  <Icon className={`h-4 w-4 shrink-0 ${index === 0 ? "text-yellow-400" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm truncate">{topic.topicName}</span>
                      <Badge
                        variant={topic.category === "paid" ? "default" : "outline"}
                        className="text-[9px] px-1 py-0 h-4 shrink-0"
                      >
                        {topic.category === "paid" ? "Pago" : "Gratuito"}
                      </Badge>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          index === 0
                            ? "bg-yellow-400"
                            : index === 1
                              ? "bg-gray-300"
                              : index === 2
                                ? "bg-amber-600"
                                : "bg-primary/50"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums w-8 text-right">
                    {topic.bookingCount}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
