"use client"

import { useState } from "react"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { Tip, TipPlacement } from "@/lib/types/database"

interface TipFormProps {
  tip?: Tip
  onSuccess?: () => void
}

export function TipForm({ tip, onSuccess }: TipFormProps) {
  const isEditing = Boolean(tip)
  const [title, setTitle] = useState(tip?.title ?? "")
  const [body, setBody] = useState(tip?.body ?? "")
  const [placement, setPlacement] = useState<TipPlacement>(tip?.placement ?? "both")
  const [sortOrder, setSortOrder] = useState(tip?.sort_order ?? 0)
  const [isActive, setIsActive] = useState(tip?.is_active ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const endpoint = isEditing ? `/api/admin/tips/${tip!.id}` : "/api/admin/tips"
      const res = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          placement,
          sort_order: sortOrder,
          is_active: isActive,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao salvar dica")
      }

      if (!isEditing) {
        setTitle("")
        setBody("")
        setPlacement("both")
        setSortOrder(0)
        setIsActive(true)
      }

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar dica")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tip-title">Título</Label>
          <Input
            id="tip-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="LinkedIn aumenta sua visibilidade"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tip-order">Ordem</Label>
          <Input
            id="tip-order"
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tip-body">Texto da dica</Label>
        <Textarea
          id="tip-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          placeholder="Escreva uma dica objetiva para quem está estudando conteúdo ou procurando vagas."
          required
        />
        <p className="text-xs text-muted-foreground">
          O texto aparece como um bloco curto nas páginas públicas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tip-placement">Onde aparece</Label>
          <Select
            value={placement}
            onValueChange={(value) => setPlacement(value as TipPlacement)}
          >
            <SelectTrigger id="tip-placement">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Conteúdo e vagas</SelectItem>
              <SelectItem value="content">Somente conteúdo</SelectItem>
              <SelectItem value="jobs">Somente vagas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 pt-6">
          <Switch id="tip-active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="tip-active">Dica ativa</Label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || !title || !body}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {loading ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar dica"}
      </Button>
    </form>
  )
}
