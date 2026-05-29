"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ContentSuggestionWithUser } from "@/lib/types/database"

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendentes" },
  { value: "reviewed", label: "Revisadas" },
  { value: "approved", label: "Aprovadas" },
  { value: "archived", label: "Arquivadas" },
  { value: "all", label: "Todas" },
] as const

export function ContentSuggestions() {
  const [items, setItems] = useState<ContentSuggestionWithUser[]>([])
  const [status, setStatus] = useState<string>("pending")
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const qs = status === "all" ? "" : `?status=${status}`
    fetch(`/api/admin/content/suggestions${qs}`)
      .then((r) => r.json())
      .then((json) => setItems(json.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  async function updateStatus(id: string, newStatus: "reviewed" | "approved" | "archived") {
    setBusyId(id)
    try {
      await fetch(`/api/admin/content/suggestions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      load()
    } finally {
      setBusyId(null)
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover esta sugestao?")) return
    setBusyId(id)
    try {
      await fetch(`/api/admin/content/suggestions/${id}`, { method: "DELETE" })
      load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Solicitacoes e indicacoes</h2>
          <p className="text-xs text-muted-foreground">
            Sugestoes de conteudo enviadas pela comunidade.
          </p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhuma sugestao{status !== "all" ? " neste status" : ""}.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((s) => (
            <li
              key={s.id}
              className="rounded-md border border-border bg-card p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant={s.type === "indication" ? "default" : "outline"}
                  className="text-xs"
                >
                  {s.type === "indication" ? "Indicacao" : "Solicitacao"}
                </Badge>
                {s.status !== "pending" && (
                  <Badge variant="outline" className="text-xs">
                    {s.status === "reviewed" ? "Revisada" : s.status === "approved" ? "Aprovada" : "Arquivada"}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>

              {s.title && <p className="text-sm font-medium">{s.title}</p>}
              {s.description && (
                <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">
                  {s.description}
                </p>
              )}
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir link
                </a>
              )}

              <p className="mt-2 text-xs text-muted-foreground">
                {s.profiles?.full_name ? `Por ${s.profiles.full_name}` : "Anonimo"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {s.status !== "reviewed" && s.status !== "approved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={busyId === s.id}
                    onClick={() => updateStatus(s.id, "reviewed")}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Revisada
                  </Button>
                )}
                {s.status !== "approved" && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs"
                    disabled={busyId === s.id}
                    onClick={() => updateStatus(s.id, "approved")}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Aprovar
                  </Button>
                )}
                {s.status !== "archived" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    disabled={busyId === s.id}
                    onClick={() => updateStatus(s.id, "archived")}
                  >
                    <Archive className="mr-1 h-3 w-3" /> Arquivar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive"
                  disabled={busyId === s.id}
                  onClick={() => remove(s.id)}
                >
                  <Trash2 className="mr-1 h-3 w-3" /> Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
