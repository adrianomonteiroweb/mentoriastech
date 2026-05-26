"use client"

import { useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ContentForm } from "@/components/dashboard/admin/content-form"
import { Trash2, Eye, EyeOff, Pencil, Share2 } from "lucide-react"
import type { ContentItemWithCategory } from "@/lib/types/database"

interface ContentTableProps {
  refreshKey?: number
}

export function ContentTable({ refreshKey = 0 }: ContentTableProps) {
  const [items, setItems] = useState<ContentItemWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editingContent, setEditingContent] = useState<ContentItemWithCategory | null>(null)

  function loadContent() {
    setLoading(true)
    fetch("/api/admin/content")
      .then((r) => r.json())
      .then((json) => setItems(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadContent() }, [refreshKey])

  async function togglePublish(id: string, isPublished: boolean) {
    await fetch(`/api/admin/content/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !isPublished }),
    })
    loadContent()
  }

  async function deleteItem(id: string) {
    if (!confirm("Remover este conteudo?")) return
    await fetch(`/api/admin/content/${id}`, { method: "DELETE" })
    loadContent()
  }

  function handleEditSuccess() {
    setEditingContent(null)
    loadContent()
  }

  const typeLabels: Record<string, string> = {
    pdf: "PDF",
    article: "Artigo",
    video: "Video",
    link: "Link",
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titulo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Compart.</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                ))}
              </TableRow>
            ))
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Nenhum conteudo cadastrado
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{typeLabels[item.content_type]}</Badge>
                </TableCell>
                <TableCell className="text-xs">{item.content_categories?.name || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.view_count}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Share2 className="h-3 w-3" />
                    {item.share_count ?? 0}
                  </span>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => togglePublish(item.id, item.is_published)}
                    className="flex items-center gap-1 text-xs"
                  >
                    {item.is_published ? (
                      <><Eye className="h-3 w-3 text-green-500" /> <span className="text-green-500">Publicado</span></>
                    ) : (
                      <><EyeOff className="h-3 w-3 text-muted-foreground" /> <span className="text-muted-foreground">Rascunho</span></>
                    )}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditingContent(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editingContent} onOpenChange={(open) => !open && setEditingContent(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar conteudo</DialogTitle>
          </DialogHeader>
          {editingContent && (
            <ContentForm
              key={editingContent.id}
              content={editingContent}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
