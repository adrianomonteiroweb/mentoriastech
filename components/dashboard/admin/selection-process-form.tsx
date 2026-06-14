"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, Send } from "lucide-react"
import type { SelectionProcess } from "@/lib/types/database"

interface SelectionProcessFormProps {
  process?: SelectionProcess
  onSuccess?: (process: SelectionProcess) => void
}

export function SelectionProcessForm({ process, onSuccess }: SelectionProcessFormProps) {
  const isEditing = Boolean(process)
  const [company, setCompany] = useState(process?.company || "")
  const [position, setPosition] = useState(process?.position || "")
  const [description, setDescription] = useState(process?.description || "")
  const [status, setStatus] = useState<SelectionProcess["status"]>(process?.status || "open")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const endpoint = isEditing
        ? `/api/admin/selection-processes/${process!.id}`
        : "/api/admin/selection-processes"

      const res = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          position,
          description: description || undefined,
          ...(isEditing ? { status } : {}),
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || "Erro ao salvar processo seletivo")
      }

      if (!isEditing) {
        setCompany("")
        setPosition("")
        setDescription("")
      }

      onSuccess?.(data?.data as SelectionProcess)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company">Empresa</Label>
          <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required placeholder="Ex: Nubank" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="position">Posicao</Label>
          <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} required placeholder="Ex: Desenvolvedor Frontend Jr" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descricao (opcional)</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detalhes sobre a vaga ou o processo" />
      </div>

      {isEditing && (
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as SelectionProcess["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="closed">Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
        {loading ? "Salvando..." : isEditing ? "Salvar alteracoes" : "Criar processo seletivo"}
      </Button>
    </form>
  )
}
