"use client"

import { Clock, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { SimApplicationApi } from "@/lib/types/database"

export function ApplicationStatusCard({
  application,
}: {
  application: SimApplicationApi
}) {
  if (application.status === "pending") {
    return (
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex items-center gap-3 py-4 px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              Candidatura enviada
            </p>
            <p className="text-sm text-muted-foreground">
              {application.template?.title} — aguardando aprovação do mentor.
              Você será avisado por aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4 px-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <XCircle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            Candidatura não aprovada
          </p>
          <p className="text-sm text-muted-foreground">
            {application.template?.title}
            {application.review_note
              ? ` — ${application.review_note}`
              : " — você pode se candidatar a outra vaga."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
