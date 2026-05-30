"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, ExternalLink, Loader2, Plus, Save, Trash2 } from "lucide-react"
import {
  MENTORSHIP_CHECKLIST_SETTING_KEY,
  normalizeMentorshipChecklistConfig,
  type MentorshipChecklistConfigItem,
} from "@/lib/mentorship-checklist"
import {
  RESUME_AI_PROMPT_SETTING_KEY,
  normalizeResumeAiPrompt,
} from "@/lib/resume-ai-prompt"
import {
  LINKEDIN_AI_PROMPT_SETTING_KEY,
  normalizeLinkedinAiPrompt,
} from "@/lib/linkedin-ai-prompt"

export default function AdminSettingsPage() {
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [checklist, setChecklist] = useState<MentorshipChecklistConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingChecklist, setSavingChecklist] = useState(false)
  const [checklistMessage, setChecklistMessage] = useState("")
  const [resumePrompt, setResumePrompt] = useState("")
  const [savingResumePrompt, setSavingResumePrompt] = useState(false)
  const [resumePromptMessage, setResumePromptMessage] = useState("")
  const [linkedinPrompt, setLinkedinPrompt] = useState("")
  const [savingLinkedinPrompt, setSavingLinkedinPrompt] = useState(false)
  const [linkedinPromptMessage, setLinkedinPromptMessage] = useState("")

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        const settings = json.data || {}
        if (settings.google_calendar) {
          setCalendarConnected(!!settings.google_calendar.is_connected)
        }
        const checklistSetting = settings[MENTORSHIP_CHECKLIST_SETTING_KEY]
        setChecklist(
          Array.isArray(checklistSetting)
            ? normalizeMentorshipChecklistConfig(checklistSetting, false)
            : normalizeMentorshipChecklistConfig(checklistSetting),
        )
        setResumePrompt(normalizeResumeAiPrompt(settings[RESUME_AI_PROMPT_SETTING_KEY]))
        setLinkedinPrompt(normalizeLinkedinAiPrompt(settings[LINKEDIN_AI_PROMPT_SETTING_KEY]))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function saveResumePrompt() {
    setSavingResumePrompt(true)
    setResumePromptMessage("")

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: RESUME_AI_PROMPT_SETTING_KEY,
          value: resumePrompt,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao salvar prompt")
      }

      setResumePromptMessage("Prompt salvo.")
    } catch (error) {
      setResumePromptMessage(
        error instanceof Error ? error.message : "Erro ao salvar prompt",
      )
    } finally {
      setSavingResumePrompt(false)
    }
  }

  async function saveLinkedinPrompt() {
    setSavingLinkedinPrompt(true)
    setLinkedinPromptMessage("")

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: LINKEDIN_AI_PROMPT_SETTING_KEY,
          value: linkedinPrompt,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao salvar prompt")
      }

      setLinkedinPromptMessage("Prompt salvo.")
    } catch (error) {
      setLinkedinPromptMessage(
        error instanceof Error ? error.message : "Erro ao salvar prompt",
      )
    } finally {
      setSavingLinkedinPrompt(false)
    }
  }

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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Melhoria de currículo com IA</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Instruções adicionais para a IA ao gerar o currículo otimizado do
              mentorado. Já existe um prompt base no sistema (melhorar a aderência à
              vaga, manter os fatos, otimizar para ATS); o texto abaixo é somado a
              ele. Deixe em branco para usar apenas o prompt base.
            </p>
            <Textarea
              value={resumePrompt}
              onChange={(e) => {
                setResumePromptMessage("")
                setResumePrompt(e.target.value)
              }}
              rows={8}
              placeholder="Ex.: priorize experiências com automação RPA; mantenha no máximo 2 páginas; use tom direto."
            />

            {resumePromptMessage && (
              <p className="text-sm text-muted-foreground">{resumePromptMessage}</p>
            )}

            <Button type="button" onClick={saveResumePrompt} disabled={savingResumePrompt}>
              {savingResumePrompt ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Salvar prompt
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Melhoria de LinkedIn com IA</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Instruções adicionais para a IA ao analisar o perfil LinkedIn do
              mentorado. Já existe um prompt base no sistema (análise de headline,
              sobre, experiências, idioma, recomendações, publicações e networking);
              o texto abaixo é somado a ele. Deixe em branco para usar apenas o prompt base.
            </p>
            <Textarea
              value={linkedinPrompt}
              onChange={(e) => {
                setLinkedinPromptMessage("")
                setLinkedinPrompt(e.target.value)
              }}
              rows={8}
              placeholder="Ex.: foque em posicionamento para vagas internacionais; sugira headline bilíngue; priorize networking em comunidades de tech."
            />

            {linkedinPromptMessage && (
              <p className="text-sm text-muted-foreground">{linkedinPromptMessage}</p>
            )}

            <Button type="button" onClick={saveLinkedinPrompt} disabled={savingLinkedinPrompt}>
              {savingLinkedinPrompt ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Salvar prompt
            </Button>
          </CardContent>
        </Card>

      </div>
    </>
  )
}
