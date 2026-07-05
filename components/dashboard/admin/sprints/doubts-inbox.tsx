"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Inbox, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface DoubtGroup {
  sprint_id: string
  sprint_title: string
  mentee_name: string | null
  mentee_email: string
  messages: {
    id: string
    body: string
    sprint_day: number
    created_at: string
  }[]
}

interface Props {
  basePath: string
  refreshKey?: number
  onCount?: (count: number) => void
}

/** Inbox de dúvidas: mensagens de mentorados ainda não lidas, agrupadas por sprint. */
export function DoubtsInbox({ basePath, refreshKey, onCount }: Props) {
  const [groups, setGroups] = useState<DoubtGroup[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/sprints/doubts")
      const json = await res.json()
      if (res.ok) {
        const data: DoubtGroup[] = json.data || []
        setGroups(data)
        onCount?.(
          data.reduce((sum, group) => sum + group.messages.length, 0),
        )
      }
    } finally {
      setLoading(false)
    }
  }, [onCount])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Carregando dúvidas">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <Inbox className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
        <p className="mt-2 text-base text-muted-foreground">
          Caixa zerada — nenhuma mensagem aguardando resposta.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <Link
          key={group.sprint_id}
          href={`${basePath}/${group.sprint_id}?tab=daily`}
          className="block group"
        >
          <Card className="transition-colors group-hover:border-primary/40">
            <CardContent className="flex flex-col gap-2 py-4 px-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-foreground">
                  {group.mentee_name || group.mentee_email}
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {group.messages.length}{" "}
                    {group.messages.length === 1 ? "mensagem" : "mensagens"}
                  </span>
                </p>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
                  aria-hidden="true"
                />
              </div>
              <p className="text-sm text-muted-foreground">{group.sprint_title}</p>
              <div className="flex flex-col gap-1.5">
                {group.messages.slice(0, 3).map((message) => (
                  <p
                    key={message.id}
                    className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-foreground line-clamp-2"
                  >
                    <span className="text-xs text-muted-foreground mr-1.5">
                      Dia {message.sprint_day}:
                    </span>
                    {message.body}
                  </p>
                ))}
                {group.messages.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    + {group.messages.length - 3} mensagens…
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
