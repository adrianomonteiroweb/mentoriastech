"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, CheckCircle2, ExternalLink } from "lucide-react"

export default function AdminSettingsPage() {
  const [pixKey, setPixKey] = useState("")
  const [pixName, setPixName] = useState("")
  const [pixCity, setPixCity] = useState("")
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        const settings = json.data || {}
        if (settings.pix_config) {
          setPixKey(settings.pix_config.key || "")
          setPixName(settings.pix_config.name || "")
          setPixCity(settings.pix_config.city || "")
        }
        if (settings.google_calendar) {
          setCalendarConnected(!!settings.google_calendar.refresh_token)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function savePix() {
    setSaving(true)
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "pix_config",
        value: { key: pixKey, name: pixName, city: pixCity, type: "cpf" },
      }),
    })
    setSaving(false)
    setMessage("Configuracoes salvas!")
    setTimeout(() => setMessage(""), 3000)
  }

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
            <CardTitle className="text-sm">Chave PIX para doacoes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pixKey">Chave PIX (CPF)</Label>
              <Input id="pixKey" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="00000000000" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pixName">Nome do recebedor</Label>
              <Input id="pixName" value={pixName} onChange={(e) => setPixName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pixCity">Cidade</Label>
              <Input id="pixCity" value={pixCity} onChange={(e) => setPixCity(e.target.value)} />
            </div>
            <Button onClick={savePix} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar PIX
            </Button>
          </CardContent>
        </Card>

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

        {message && (
          <p className="flex items-center gap-1 text-sm text-green-500">
            <CheckCircle2 className="h-4 w-4" /> {message}
          </p>
        )}
      </div>
    </>
  )
}
