"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Trash2, Eye, EyeOff, MousePointerClick, Percent } from "lucide-react"
import type { Ad } from "@/lib/types/database"
import Image from "next/image"

interface AdsTableProps {
  refreshKey?: number
}

export function AdsTable({ refreshKey = 0 }: AdsTableProps) {
  const [items, setItems] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)

  function loadAds() {
    setLoading(true)
    fetch("/api/admin/ads")
      .then((r) => r.json())
      .then((json) => setItems(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAds()
  }, [refreshKey])

  async function toggleActive(id: string, currentState: boolean) {
    await fetch(`/api/admin/ads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !currentState }),
    })
    loadAds()
  }

  async function deleteItem(id: string) {
    if (!confirm("Remover este anúncio?")) return
    await fetch(`/api/admin/ads/${id}`, { method: "DELETE" })
    loadAds()
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imagem</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead>Ordem</TableHead>
            <TableHead>Visualizações</TableHead>
            <TableHead>Cliques</TableHead>
            <TableHead>Conversão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 9 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                Nenhum anúncio cadastrado
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.image_url ? (
                    <div className="relative h-10 w-10 rounded overflow-hidden">
                      <Image src={item.image_url} alt={item.title} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center text-muted-foreground text-xs">
                      —
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {item.whatsapp_number || "—"}
                </TableCell>
                <TableCell className="text-xs">{item.sort_order}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {item.view_count}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MousePointerClick className="h-3 w-3" />
                    {item.click_count}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    item.view_count > 0 && (item.click_count / item.view_count) * 100 >= 5
                      ? "text-green-500"
                      : item.view_count > 0 && (item.click_count / item.view_count) * 100 >= 2
                        ? "text-yellow-500"
                        : "text-muted-foreground"
                  }`}>
                    <Percent className="h-3 w-3" />
                    {item.view_count > 0
                      ? ((item.click_count / item.view_count) * 100).toFixed(1) + "%"
                      : "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={item.is_active ? "bg-green-500/10 text-green-600" : "bg-gray-500/10 text-gray-600"}>
                    {item.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(item.id, item.is_active)}
                      className="text-xs"
                    >
                      {item.is_active ? (
                        <><EyeOff className="h-3 w-3 mr-1" />Desativar</>
                      ) : (
                        <><Eye className="h-3 w-3 mr-1" />Ativar</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteItem(item.id)}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remover
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
