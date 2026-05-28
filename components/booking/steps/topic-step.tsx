"use client"

import type { TopicItem } from "@/lib/types/booking"
import {
  BookOpen,
  Loader2,
  Languages,
  Code,
  Briefcase,
  MessageSquare,
  Search,
  Zap,
  Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StepNavigation } from "../step-navigation"

const topicIcons: Record<string, React.ReactNode> = {
  "praticar inglês": <Languages className="h-5 w-5" />,
  "programação para outras profissões": <Code className="h-5 w-5" />,
  "carreira em programação": <Briefcase className="h-5 w-5" />,
  "preparação para entrevistas": <MessageSquare className="h-5 w-5" />,
  "busca de oportunidades": <Search className="h-5 w-5" />,
  "desenvolvimento web": <Globe className="h-5 w-5" />,
  "automações rpa": <Zap className="h-5 w-5" />,
}

function getIconForTopic(topicName: string): React.ReactNode {
  const lowerName = topicName.toLowerCase()
  for (const [key, icon] of Object.entries(topicIcons)) {
    if (lowerName.includes(key)) {
      return icon
    }
  }
  return <BookOpen className="h-5 w-5" />
}

interface TopicStepProps {
  topics: TopicItem[]
  selectedTopicId: string
  loading: boolean
  onSelect: (topicId: string, topicName: string) => void
  onNext: () => void
  onBack: () => void
}

export function TopicStep({
  topics,
  selectedTopicId,
  loading,
  onSelect,
  onNext,
  onBack,
}: TopicStepProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando temas...
      </div>
    )
  }

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhum tema disponível no momento.
        </p>
        <StepNavigation
          onBack={onBack}
          onNext={onNext}
          canGoNext={false}
          isFirst={true}
          isLast={false}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Sobre qual assunto gostaria de conversar?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => {
              onSelect(topic.id, topic.name)
              // Auto-advance after brief feedback
              setTimeout(onNext, 400)
            }}
            className={cn(
              "flex flex-col gap-2 rounded-lg border p-3 text-left transition-all duration-200",
              selectedTopicId === topic.id
                ? "border-primary bg-primary/5 ring-1 ring-primary/20 scale-[1.02]"
                : "border-border bg-card hover:border-muted-foreground/30",
            )}
          >
            <div className="flex items-start gap-2">
              <div className="text-primary/80 flex-shrink-0 mt-0.5">
                {getIconForTopic(topic.name)}
              </div>
              <div className="flex flex-col gap-0.5 flex-1">
                <span className="text-sm font-medium text-foreground">
                  {topic.name}
                </span>
                {topic.description && (
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {topic.description}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <StepNavigation
        onBack={onBack}
        onNext={onNext}
        canGoNext={!!selectedTopicId}
        isFirst={true}
        isLast={false}
      />
    </div>
  )
}
