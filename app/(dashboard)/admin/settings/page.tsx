"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react"

export default function AdminSettingsPage() {
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        const settings = json.data || {}
        if (settings.google_calendar) {
          setCalendarConnected(!!settings.google_calendar.refresh_token)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function connectCalendar() {
    const res = await fetch("/api/admin/calendar/auth")
    const { url } = await res.json()
    if (url) {
      window.open(url, "_blank")
    }
  }

  if (loading) {
    return (
      <>
        <DashboardHeader title="Configuracoes" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <DashboardHeader title="Configuracoes" description="Ajustes gerais da plataforma" />
      <div className="flex flex-col gap-6 p-4 md:p-6 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Google Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {calendarConnected ? (
              <p className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" /> Conectado
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Conecte sua conta Google para criar eventos automaticamente ao agendar mentorias.
              </p>
            )}
            <Button variant="outline" onClick={connectCalendar}>
              <ExternalLink className="h-4 w-4 mr-1" />
              {calendarConnected ? "Reconectar" : "Conectar Google Calendar"}
            </Button>
          </CardContent>
        </Card>

      </div>
    </>
  )
}
