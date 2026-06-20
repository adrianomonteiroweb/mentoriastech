"use client"

import { ArrowLeft, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { StatusIndicator } from "@/components/minhas-mentorias/status-indicator"
import type { BookingStatus } from "@/lib/types/database"

interface SessionDetailHeaderProps {
  bookingId: string
  topicName: string | null
  status: BookingStatus
}

export function SessionDetailHeader({ bookingId, topicName, status }: SessionDetailHeaderProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Voltar para o histórico"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-1 flex-col min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">
            {topicName || "Mentoria"}
          </h1>
        </div>

        <StatusIndicator status={status} size="sm" />

        <a
          href={`/api/minhas-mentorias/pdf/${bookingId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border min-h-[44px] px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Baixar PDF desta sessão"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">PDF</span>
        </a>
      </div>
    </header>
  )
}
