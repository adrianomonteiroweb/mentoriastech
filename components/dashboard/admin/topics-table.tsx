"use client"

import { useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Trash2 } from "lucide-react"
import type { MentoringTopic } from "@/lib/types/database"

export function TopicsTable() {
  const [topics, setTopics] = useState<MentoringTopic[]>([])
  const [loading, setLoading] = useState(true)

  function loadTopics() {
    setLoading(true)
    fetch("/api/admin/topics")
      .then((r) => r.json())
      .then((json) => setTopics(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTopics() }, [])

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

  async function addTopic() {
    const name = prompt("Nome do tema:")
    const category = prompt("Categoria (free/paid):") || "free"
    if (!name) return

    await fetch("/api/admin/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category }),
    })
    loadTopics()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Temas de Mentoria</h3>
        <Button size="sm" onClick={addTopic}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

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
