"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SimEvaluationRule } from "@/lib/types/database"

type RuleKind = SimEvaluationRule["kind"]

const KIND_OPTIONS: { value: RuleKind; label: string }[] = [
  { value: "path_exists", label: "Arquivo/pasta deve existir" },
  { value: "path_matches", label: "Paths casando com padrão (glob)" },
  { value: "path_absent", label: "Padrão proibido (nenhum path casa)" },
  { value: "file_name_pattern", label: "Nomeação dos arquivos de uma pasta" },
  { value: "content_includes", label: "Arquivo deve conter (regex)" },
  { value: "content_excludes", label: "Arquivo não pode conter (regex)" },
]

const CATEGORY_OPTIONS = [
  { value: "structure", label: "Estrutura" },
  { value: "code", label: "Código" },
  { value: "tests", label: "Testes" },
  { value: "architecture", label: "Arquitetura" },
] as const

function newRule(kind: RuleKind): SimEvaluationRule {
  const base = {
    id: crypto.randomUUID(),
    label: "",
    category: "structure" as const,
    weight: 1,
  }
  switch (kind) {
    case "path_exists":
      return { ...base, kind, path: "" }
    case "path_matches":
      return { ...base, kind, pattern: "" }
    case "path_absent":
      return { ...base, kind, pattern: "" }
    case "file_name_pattern":
      return { ...base, kind, dir: "", pattern: "" }
    case "content_includes":
      return { ...base, kind: "content_includes", path: "", regex: "" }
    case "content_excludes":
      return { ...base, kind: "content_excludes", path: "", regex: "" }
  }
}

interface Props {
  value: SimEvaluationRule[]
  onChange: (rules: SimEvaluationRule[]) => void
}

/**
 * Editor estruturado das regras de avaliação automática — o mentor monta
 * checagens por campos, sem digitar JSON. Executadas quando o mentorado
 * envia a task para review.
 */
export function RulesEditor({ value, onChange }: Props) {
  function update(index: number, patch: Partial<SimEvaluationRule>) {
    onChange(
      value.map((rule, i) =>
        i === index ? ({ ...rule, ...patch } as SimEvaluationRule) : rule,
      ),
    )
  }

  function changeKind(index: number, kind: RuleKind) {
    const current = value[index]
    onChange(
      value.map((rule, i) =>
        i === index
          ? {
              ...newRule(kind),
              id: current.id,
              label: current.label,
              category: current.category,
              weight: current.weight,
            }
          : rule,
      ),
    )
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Sem regras — a task não terá avaliação automática ao ir para review.
        </p>
      )}

      {value.map((rule, index) => (
        <div
          key={rule.id}
          className="flex flex-col gap-2 rounded-lg border border-border p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Regra {index + 1}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={() => remove(index)}
              aria-label={`Remover regra ${index + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Select
              value={rule.kind}
              onValueChange={(kind) => changeKind(index, kind as RuleKind)}
            >
              <SelectTrigger aria-label="Tipo de checagem">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Select
                value={rule.category}
                onValueChange={(category) =>
                  update(index, {
                    category: category as SimEvaluationRule["category"],
                  })
                }
              >
                <SelectTrigger aria-label="Categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                max={10}
                value={rule.weight}
                onChange={(e) =>
                  update(index, { weight: Number(e.target.value) || 1 })
                }
                className="w-20"
                aria-label="Peso"
                title="Peso da regra"
              />
            </div>
          </div>

          <Input
            value={rule.label}
            onChange={(e) => update(index, { label: e.target.value })}
            placeholder="Descrição exibida ao mentorado (ex.: Controller separado em src/controllers)"
            aria-label="Descrição da regra"
          />

          {rule.kind === "path_exists" && (
            <Input
              value={rule.path}
              onChange={(e) => update(index, { path: e.target.value })}
              placeholder="Caminho exato — ex.: src/controllers/product.controller.ts"
              aria-label="Caminho"
            />
          )}

          {(rule.kind === "path_matches" || rule.kind === "path_absent") && (
            <div className="flex gap-2">
              <Input
                value={rule.pattern}
                onChange={(e) => update(index, { pattern: e.target.value })}
                placeholder="Glob — ex.: src/services/*.service.ts ou src/**/*.test.ts"
                aria-label="Padrão glob"
                className="flex-1"
              />
              {rule.kind === "path_matches" && (
                <Input
                  type="number"
                  min={1}
                  value={rule.min ?? 1}
                  onChange={(e) =>
                    update(index, { min: Number(e.target.value) || 1 })
                  }
                  className="w-20"
                  aria-label="Mínimo de ocorrências"
                  title="Mínimo de arquivos casando"
                />
              )}
            </div>
          )}

          {rule.kind === "file_name_pattern" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={rule.dir}
                onChange={(e) => update(index, { dir: e.target.value })}
                placeholder="Pasta — ex.: src/controllers"
                aria-label="Pasta"
                className="flex-1"
              />
              <Input
                value={rule.pattern}
                onChange={(e) => update(index, { pattern: e.target.value })}
                placeholder="Padrão dos nomes — ex.: *.controller.ts"
                aria-label="Padrão de nomeação"
                className="flex-1"
              />
            </div>
          )}

          {(rule.kind === "content_includes" ||
            rule.kind === "content_excludes") && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={rule.path}
                onChange={(e) => update(index, { path: e.target.value })}
                placeholder="Arquivo — ex.: src/app.ts"
                aria-label="Arquivo"
                className="flex-1"
              />
              <Input
                value={rule.regex}
                onChange={(e) => update(index, { regex: e.target.value })}
                placeholder={
                  rule.kind === "content_includes"
                    ? "Regex que deve aparecer — ex.: express\\(\\)"
                    : "Regex proibida — ex.: console\\.log"
                }
                aria-label="Expressão regular"
                className="flex-1"
              />
            </div>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-[40px] self-start"
        onClick={() => onChange([...value, newRule("path_exists")])}
        disabled={value.length >= 20}
      >
        <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
        Adicionar regra
      </Button>
    </div>
  )
}
