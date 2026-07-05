"use client"

import { useState } from "react"
import { ChevronDown, Loader2, ShieldCheck } from "lucide-react"
import { RulesEditor } from "./rules-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import type {
  SimEvaluationRule,
  SimTaskType,
  SimTemplateTaskApi,
} from "@/lib/types/database"

const TASK_TYPE_OPTIONS: { value: SimTaskType; label: string }[] = [
  { value: "feature", label: "Feature" },
  { value: "bug", label: "Correção de bug" },
  { value: "refactor", label: "Refatoração" },
  { value: "architecture", label: "Ajuste de arquitetura" },
  { value: "increment", label: "Evolução incremental" },
]

export interface TaskFormValues {
  title: string
  description: string
  task_type: SimTaskType
  points: number
  initial_status: "backlog" | "todo"
  sort_order?: number
  evaluation_rules: SimEvaluationRule[] | null
}

function ruleIsComplete(rule: SimEvaluationRule): boolean {
  if (!rule.label.trim()) return false
  switch (rule.kind) {
    case "path_exists":
      return Boolean(rule.path.trim())
    case "path_matches":
    case "path_absent":
      return Boolean(rule.pattern.trim())
    case "file_name_pattern":
      return Boolean(rule.dir.trim() && rule.pattern.trim())
    case "content_includes":
    case "content_excludes":
      return Boolean(rule.path.trim() && rule.regex.trim())
  }
}

interface Props {
  initial?: SimTemplateTaskApi | null
  submitLabel?: string
  onSubmit: (values: TaskFormValues) => Promise<boolean>
}

/** Form de task (template ou ad-hoc na sprint): título, critérios, tipo, pontos, coluna inicial. */
export function TemplateTaskForm({ initial, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [taskType, setTaskType] = useState<SimTaskType>(
    initial?.task_type ?? "feature",
  )
  const [points, setPoints] = useState(String(initial?.points ?? 10))
  const [initialStatus, setInitialStatus] = useState<"backlog" | "todo">(
    initial?.initial_status ?? "backlog",
  )
  const [rules, setRules] = useState<SimEvaluationRule[]>(
    initial?.evaluation_rules ?? [],
  )
  const [rulesOpen, setRulesOpen] = useState(
    Boolean(initial?.evaluation_rules?.length),
  )
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rules.some((rule) => !ruleIsComplete(rule))) {
      toast.error(
        "Complete todos os campos das regras de avaliação (ou remova as incompletas)",
      )
      return
    }
    setSaving(true)
    try {
      const ok = await onSubmit({
        title,
        description,
        task_type: taskType,
        points: Number(points) || 10,
        initial_status: initialStatus,
        sort_order: initial?.sort_order,
        evaluation_rules: rules.length > 0 ? rules : null,
      })
      if (ok && !initial) {
        setTitle("")
        setDescription("")
        setTaskType("feature")
        setPoints("10")
        setInitialStatus("backlog")
        setRules([])
        setRulesOpen(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-title" className="text-sm font-medium">
          Título
        </label>
        <Input
          id="task-title"
          required
          minLength={3}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Criar endpoint POST /products"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-description" className="text-sm font-medium">
          Descrição e critérios de aceite (markdown)
        </label>
        <Textarea
          id="task-description"
          rows={5}
          maxLength={20_000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={"Criar endpoint POST /products\n\nCritérios:\n- Controller separado\n- Service implementado\n- Status 201 retornado"}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" id="task-type-label">
            Tipo
          </label>
          <Select
            value={taskType}
            onValueChange={(value) => setTaskType(value as SimTaskType)}
          >
            <SelectTrigger aria-labelledby="task-type-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="task-points" className="text-sm font-medium">
            Pontos
          </label>
          <Input
            id="task-points"
            type="number"
            min={1}
            max={100}
            required
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" id="task-status-label">
            Coluna inicial
          </label>
          <Select
            value={initialStatus}
            onValueChange={(value) =>
              setInitialStatus(value as "backlog" | "todo")
            }
          >
            <SelectTrigger aria-labelledby="task-status-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Collapsible open={rulesOpen} onOpenChange={setRulesOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between min-h-[44px]"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Avaliação automática
              {rules.length > 0 && ` (${rules.length} regras)`}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${rulesOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <RulesEditor value={rules} onChange={setRules} />
        </CollapsibleContent>
      </Collapsible>

      <Button type="submit" disabled={saving || title.trim().length < 3} className="min-h-[44px]">
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
        {submitLabel || (initial ? "Salvar task" : "Adicionar task")}
      </Button>
    </form>
  )
}
