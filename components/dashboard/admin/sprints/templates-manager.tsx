"use client"

import { useCallback, useEffect, useState } from "react"
import { ClipboardList, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { TemplateTaskForm, type TaskFormValues } from "./template-task-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import type {
  SimCompanyApi,
  SimSprintTemplateApi,
  SimTemplateTaskApi,
} from "@/lib/types/database"

const LEVEL_LABELS: Record<number, string> = {
  1: "Nível 1 — Estrutura de projeto",
  2: "Nível 2 — Completar arquivos",
  3: "Nível 3 — Corrigir estrutura",
  4: "Nível 4 — Corrigir bugs",
  5: "Nível 5 — Feature completa",
  6: "Nível 6 — Refatoração e arquitetura",
}

interface TemplateFormState {
  company_id: string
  title: string
  objective: string
  level: number
  duration_days: number
  is_active: boolean
}

export function TemplatesManager() {
  const [templates, setTemplates] = useState<SimSprintTemplateApi[]>([])
  const [companies, setCompanies] = useState<SimCompanyApi[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<SimSprintTemplateApi | "new" | null>(null)
  const [form, setForm] = useState<TemplateFormState | null>(null)
  const [tasks, setTasks] = useState<SimTemplateTaskApi[]>([])
  const [editingTask, setEditingTask] = useState<SimTemplateTaskApi | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [templatesRes, companiesRes] = await Promise.all([
        fetch("/api/admin/sprints/templates"),
        fetch("/api/admin/sprints/companies"),
      ])
      const [templatesJson, companiesJson] = await Promise.all([
        templatesRes.json(),
        companiesRes.json(),
      ])
      if (templatesRes.ok) setTemplates(templatesJson.data || [])
      if (companiesRes.ok) setCompanies(companiesJson.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function loadTasks(templateId: string) {
    const res = await fetch(`/api/admin/sprints/templates/${templateId}`)
    const json = await res.json()
    if (res.ok) setTasks(json.data.tasks || [])
  }

  function startEdit(template: SimSprintTemplateApi | "new") {
    setEditing(template)
    setTasks([])
    if (template === "new") {
      setForm({
        company_id: companies[0]?.id ?? "",
        title: "",
        objective: "",
        level: 1,
        duration_days: 10,
        is_active: true,
      })
    } else {
      setForm({
        company_id: template.company_id,
        title: template.title,
        objective: template.objective ?? "",
        level: template.level,
        duration_days: template.duration_days,
        is_active: template.is_active,
      })
      loadTasks(template.id)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    try {
      const isNew = editing === "new"
      const res = await fetch(
        isNew
          ? "/api/admin/sprints/templates"
          : `/api/admin/sprints/templates/${(editing as SimSprintTemplateApi).id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      )
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Erro ao salvar vaga")
        return
      }
      toast.success(isNew ? "Vaga criada — agora cadastre as tasks" : "Vaga atualizada")
      if (isNew) {
        startEdit(json.data as SimSprintTemplateApi)
        load()
      } else {
        setEditing(null)
        load()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTemplate(template: SimSprintTemplateApi) {
    const res = await fetch(`/api/admin/sprints/templates/${template.id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast.error(json?.error || "Erro ao excluir vaga")
      return
    }
    toast.success("Vaga excluída")
    load()
  }

  async function handleAddTask(values: TaskFormValues) {
    if (!editing || editing === "new") return false
    const res = await fetch(
      `/api/admin/sprints/templates/${editing.id}/tasks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, sort_order: tasks.length }),
      },
    )
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error || "Erro ao adicionar task")
      return false
    }
    toast.success("Task adicionada")
    loadTasks(editing.id)
    return true
  }

  async function handleUpdateTask(values: TaskFormValues) {
    if (!editing || editing === "new" || !editingTask) return false
    const res = await fetch(
      `/api/admin/sprints/templates/${editing.id}/tasks/${editingTask.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    )
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error || "Erro ao salvar task")
      return false
    }
    toast.success("Task atualizada")
    setEditingTask(null)
    loadTasks(editing.id)
    return true
  }

  async function handleDeleteTask(task: SimTemplateTaskApi) {
    if (!editing || editing === "new") return
    const res = await fetch(
      `/api/admin/sprints/templates/${editing.id}/tasks/${task.id}`,
      { method: "DELETE" },
    )
    if (!res.ok) {
      toast.error("Erro ao excluir task")
      return
    }
    loadTasks(editing.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Carregando vagas">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (editing && form) {
    return (
      <div className="flex flex-col gap-4 max-w-3xl">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            {editing === "new" ? "Nova vaga (template de sprint)" : `Editar ${form.title}`}
          </h2>
          <Button variant="ghost" onClick={() => setEditing(null)}>
            Voltar
          </Button>
        </div>

        <form onSubmit={handleSave}>
          <Card>
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" id="template-company-label">
                  Empresa fictícia
                </label>
                <Select
                  value={form.company_id}
                  onValueChange={(value) => setForm({ ...form, company_id: value })}
                >
                  <SelectTrigger aria-labelledby="template-company-label">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="template-title" className="text-sm font-medium">
                  Título da vaga
                </label>
                <Input
                  id="template-title"
                  required
                  minLength={3}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex.: Dev Júnior Backend — Sprint API de Produtos"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="template-objective" className="text-sm font-medium">
                  Objetivos da sprint (markdown)
                </label>
                <Textarea
                  id="template-objective"
                  rows={4}
                  maxLength={20_000}
                  value={form.objective}
                  onChange={(e) => setForm({ ...form, objective: e.target.value })}
                  placeholder={"- Criar API de produtos\n- Implementar autenticação\n- Estruturar arquitetura base"}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" id="template-level-label">
                    Nível de dificuldade
                  </label>
                  <Select
                    value={String(form.level)}
                    onValueChange={(value) => setForm({ ...form, level: Number(value) })}
                  >
                    <SelectTrigger aria-labelledby="template-level-label">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="template-duration" className="text-sm font-medium">
                    Duração (dias)
                  </label>
                  <Input
                    id="template-duration"
                    type="number"
                    min={1}
                    max={30}
                    required
                    value={form.duration_days}
                    onChange={(e) =>
                      setForm({ ...form, duration_days: Number(e.target.value) || 10 })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="template-active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <Label htmlFor="template-active" className="text-sm">
                  Vaga aberta (visível para candidaturas)
                </Label>
              </div>

              <Button
                type="submit"
                disabled={saving || !form.company_id}
                className="min-h-[44px]"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {editing === "new" ? "Criar vaga" : "Salvar vaga"}
              </Button>
            </CardContent>
          </Card>
        </form>

        {editing !== "new" && (
          <Card>
            <CardContent className="flex flex-col gap-4 p-4">
              <h3 className="text-base font-semibold text-foreground">
                Tasks da sprint ({tasks.length})
              </h3>

              {tasks.length > 0 && (
                <div className="flex flex-col gap-2">
                  {tasks.map((task, index) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {index + 1}. {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {task.points} pts · inicia em{" "}
                          {task.initial_status === "backlog" ? "Backlog" : "To Do"}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingTask(task)}
                          aria-label={`Editar task ${task.title}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTask(task)}
                          aria-label={`Excluir task ${task.title}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-dashed border-border p-3">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Adicionar task
                </p>
                <TemplateTaskForm onSubmit={handleAddTask} />
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog
          open={Boolean(editingTask)}
          onOpenChange={(open) => {
            if (!open) setEditingTask(null)
          }}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar task</DialogTitle>
            </DialogHeader>
            {editingTask && (
              <TemplateTaskForm
                initial={editingTask}
                submitLabel="Salvar task"
                onSubmit={handleUpdateTask}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Cada vaga é um template de sprint: objetivos, duração e tasks que o
          mentorado recebe ao ser aprovado.
        </p>
        <Button
          onClick={() => startEdit("new")}
          disabled={companies.length === 0}
          className="min-h-[40px] shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
          Nova vaga
        </Button>
      </div>

      {companies.length === 0 && (
        <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-600 dark:text-yellow-400">
          Crie uma Empresa Fictícia antes de publicar vagas.
        </p>
      )}

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="mt-2 text-base text-muted-foreground">
            Nenhuma vaga publicada ainda.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4 px-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-foreground">
                      {template.title}
                    </p>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? "Aberta" : "Fechada"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {template.company?.name} · Nível {template.level} ·{" "}
                    {template.duration_days} dias · {template.task_count ?? 0} tasks
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[40px]"
                    onClick={() => startEdit(template)}
                    aria-label={`Editar ${template.title}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[40px] text-destructive hover:text-destructive"
                    onClick={() => handleDeleteTemplate(template)}
                    aria-label={`Excluir ${template.title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
