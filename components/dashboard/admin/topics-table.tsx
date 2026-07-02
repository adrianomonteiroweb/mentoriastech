"use client"

import { useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command, CommandGroup, CommandItem, CommandList,
} from "@/components/ui/command"
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MentoringTopic, TopicCategory } from "@/lib/types/database"
import { useMentorFilter } from "@/components/dashboard/admin/mentor-filter"

const CATEGORY_OPTIONS: { value: TopicCategory; label: string }[] = [
  { value: "free", label: "Gratuito" },
  { value: "paid", label: "Pago" },
]

export function TopicsTable() {
  const [topics, setTopics] = useState<MentoringTopic[]>([])
  const [loading, setLoading] = useState(true)
  const { mentorId, buildUrl } = useMentorFilter()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [comboOpen, setComboOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [category, setCategory] = useState<TopicCategory>("free")
  const [description, setDescription] = useState("")

  function loadTopics() {
    setLoading(true)
    fetch(buildUrl("/api/admin/topics"))
      .then((r) => r.json())
      .then((json) => setTopics(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTopics() }, [mentorId])

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/topics/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !isActive }),
    })
    loadTopics()
  }

  async function deleteTopic(id: string) {
    if (!confirm("Remover este tema?")) return
    await fetch(`/api/admin/topics/${id}`, { method: "DELETE" })
    loadTopics()
  }

  function resetForm() {
    setName("")
    setCategory("free")
    setDescription("")
    setError("")
  }

  async function handleCreate() {
    if (name.trim().length < 2) {
      setError("O nome deve ter pelo menos 2 caracteres.")
      return
    }

    setSaving(true)
    setError("")

    try {
      const res = await fetch("/api/admin/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), category, description: description.trim() || undefined }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || "Erro ao criar tema")
      }

      resetForm()
      setDialogOpen(false)
      loadTopics()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar tema")
    } finally {
      setSaving(false)
    }
  }

  const selectedLabel = CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? ""

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Temas de Mentoria</h3>
        <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {/* Dialog de criação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Tema de Mentoria</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="topic-name">Nome *</Label>
              <Input
                id="topic-name"
                placeholder="Ex: Programação do ZERO"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Categoria *</Label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboOpen}
                    className="justify-between"
                  >
                    {selectedLabel}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <CommandItem
                            key={opt.value}
                            value={opt.value}
                            onSelect={() => { setCategory(opt.value); setComboOpen(false) }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", category === opt.value ? "opacity-100" : "opacity-0")} />
                            {opt.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="topic-desc">Descrição</Label>
              <Textarea
                id="topic-desc"
                placeholder="Descrição opcional do tema..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!loading && (
        <p className="text-xs text-muted-foreground">
          Exibindo {topics.length} resultado{topics.length !== 1 ? "s" : ""}
        </p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tema</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              topics.map((topic) => (
                <TableRow key={topic.id}>
                  <TableCell className="font-medium">{topic.name}</TableCell>
                  <TableCell>
                    <Badge variant={topic.category === "paid" ? "default" : "outline"} className="text-xs capitalize">
                      {topic.category === "paid" ? "Pago" : "Gratuito"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleActive(topic.id, topic.is_active)}
                      className={`text-xs font-medium ${topic.is_active ? "text-green-500" : "text-muted-foreground"}`}
                    >
                      {topic.is_active ? "Ativo" : "Inativo"}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => deleteTopic(topic.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
