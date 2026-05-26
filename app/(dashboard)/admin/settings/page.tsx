"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, ExternalLink, Loader2, Plus, Save, Trash2 } from "lucide-react"
import {
  MENTORSHIP_CHECKLIST_SETTING_KEY,
  normalizeMentorshipChecklistConfig,
  type MentorshipChecklistConfigItem,
} from "@/lib/mentorship-checklist"

export default function AdminSettingsPage() {
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [checklist, setChecklist] = useState<MentorshipChecklistConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingChecklist, setSavingChecklist] = useState(false)
  const [checklistMessage, setChecklistMessage] = useState("")

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        const settings = json.data || {}
        if (settings.google_calendar) {
          setCalendarConnected(!!settings.google_calendar.refresh_token)
        }
        const checklistSetting = settings[MENTORSHIP_CHECKLIST_SETTING_KEY]
        setChecklist(
          Array.isArray(checklistSetting)
            ? normalizeMentorshipChecklistConfig(checklistSetting, false)
            : normalizeMentorshipChecklistConfig(checklistSetting),
        )
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

  function updateChecklistItem(id: string, label: string) {
    setChecklistMessage("")
    setChecklist((current) =>
      current.map((item) => (item.id === id ? { ...item, label } : item)),
    )
  }

  function addChecklistItem() {
    setChecklistMessage("")
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `item-${Date.now()}`

    setChecklist((current) => [...current, { id, label: "" }])
  }

  function deleteChecklistItem(id: string) {
    setChecklistMessage("")
    setChecklist((current) => current.filter((item) => item.id !== id))
  }

  async function saveChecklist() {
    setSavingChecklist(true)
    setChecklistMessage("")

    const nextChecklist = checklist
      .map((item) => ({ ...item, label: item.label.trim() }))
      .filter((item) => item.label)

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: MENTORSHIP_CHECKLIST_SETTING_KEY,
          value: nextChecklist,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao salvar checklist")
      }

      setChecklist(nextChecklist)
      setChecklistMessage("Checklist salvo.")
    } catch (error) {
      setChecklistMessage(error instanceof Error ? error.message : "Erro ao salvar checklist")
    } finally {
      setSavingChecklist(false)
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
      <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Configuracoes de mentoria</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-medium">Checklist</Label>
              <Button type="button" size="sm" variant="outline" onClick={addChecklistItem}>
                <Plus className="h-4 w-4 mr-1" />
                Item
              </Button>
            </div>

            <div className="grid gap-2">
              {checklist.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum item cadastrado.
                </p>
              ) : (
                checklist.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="flex h-9 w-7 shrink-0 items-center justify-center text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <Input
                      value={item.label}
                      onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                      placeholder="Item do checklist"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0 text-destructive"
                      onClick={() => deleteChecklistItem(item.id)}
                      aria-label={`Excluir ${item.label || "item"}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {checklistMessage && (
              <p className="text-sm text-muted-foreground">{checklistMessage}</p>
            )}

            <Button type="button" onClick={saveChecklist} disabled={savingChecklist}>
              {savingChecklist ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Salvar checklist
            </Button>
          </CardContent>
        </Card>

      </div>
    </>
  )
}
