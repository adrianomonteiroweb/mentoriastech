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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AdForm } from "@/components/dashboard/admin/ad-form"
import { ExternalLink, MessageCircle, Trash2, Eye, EyeOff, MousePointerClick, Pencil, Percent } from "lucide-react"
import type { Ad } from "@/lib/types/database"
import Image from "next/image"

interface AdsTableProps {
  refreshKey?: number
}

export function AdsTable({ refreshKey = 0 }: AdsTableProps) {
  const [items, setItems] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null)

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
    setSelectedAd(null)
    await fetch(`/api/admin/ads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !currentState }),
    })
    loadAds()
  }

  async function deleteItem(id: string) {
    if (!confirm("Remover este anúncio?")) return
    setSelectedAd(null)
    await fetch(`/api/admin/ads/${id}`, { method: "DELETE" })
    loadAds()
  }

  function openEdit(ad: Ad) {
    setSelectedAd(null)
    setEditingAd(ad)
  }

  function handleEditSuccess() {
    setEditingAd(null)
    loadAds()
  }

  function getConversion(ad: Ad) {
    if (ad.view_count <= 0) return null
    return (ad.click_count / ad.view_count) * 100
  }

  function getStatusLabel(ad: Ad) {
    if (ad.is_active) return "Ativo"
    if (ad.max_clicks != null && ad.click_count >= ad.max_clicks) return "Limite atingido"
    return "Inativo"
  }

  function getStatusClass(ad: Ad) {
    if (ad.is_active) return "bg-green-500/10 text-green-600"
    if (ad.max_clicks != null && ad.click_count >= ad.max_clicks) return "bg-red-500/10 text-red-500"
    return "bg-gray-500/10 text-gray-600"
  }

  function getConversionClass(ad: Ad) {
    const conversion = getConversion(ad)
    if (conversion == null) return "text-muted-foreground"
    if (conversion >= 5) return "text-green-500"
    if (conversion >= 2) return "text-yellow-500"
    return "text-muted-foreground"
  }

  return (
    <div className="flex flex-col gap-2">
      {!loading && (
        <p className="text-xs text-muted-foreground">
          Exibindo {items.length} resultado{items.length !== 1 ? "s" : ""}
        </p>
      )}
      <div className="grid gap-3 md:hidden">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border p-4">
              <Skeleton className="mb-3 h-24 w-full" />
              <Skeleton className="mb-3 h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="rounded-md border px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum anúncio cadastrado
          </div>
        ) : (
          items.map((item) => {
            const conversion = getConversion(item)

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedAd(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    setSelectedAd(item)
                  }
                }}
                className="rounded-md border bg-card p-4 text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Abrir ações do anúncio ${item.title}`}
              >
                <div className="flex items-start gap-3">
                  {item.image_url ? (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-black">
                      <Image
                        src={item.image_url}
                        alt={item.image_alt || item.title}
                        fill
                        sizes="64px"
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-secondary text-xs text-muted-foreground">
                      -
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                        {item.title}
                      </h3>
                      <Badge className={`shrink-0 text-[10px] ${getStatusClass(item)}`}>
                        {getStatusLabel(item)}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md border p-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      Views
                    </span>
                    <p className="font-semibold">{item.view_count}</p>
                  </div>
                  <div className="rounded-md border p-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MousePointerClick className="h-3 w-3" />
                      Cliques
                    </span>
                    <p className={item.max_clicks != null && item.click_count >= item.max_clicks ? "font-semibold text-red-500" : "font-semibold"}>
                      {item.click_count}
                      {item.max_clicks != null && <span className="font-normal text-muted-foreground">/{item.max_clicks}</span>}
                    </p>
                  </div>
                  <div className="rounded-md border p-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Percent className="h-3 w-3" />
                      Conv.
                    </span>
                    <p className={`font-semibold ${getConversionClass(item)}`}>
                      {conversion == null ? "-" : `${conversion.toFixed(1)}%`}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

    <div className="hidden overflow-x-auto rounded-md border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imagem</TableHead>
            <TableHead>Título</TableHead>
            <TableHead className="hidden md:table-cell">WhatsApp</TableHead>
            <TableHead className="hidden sm:table-cell">Ordem</TableHead>
            <TableHead className="hidden sm:table-cell">Visualizações</TableHead>
            <TableHead className="hidden sm:table-cell">Cliques</TableHead>
            <TableHead className="hidden lg:table-cell">Conversão</TableHead>
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
                    <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-black">
                      <Image
                        src={item.image_url}
                        alt={item.image_alt || item.title}
                        fill
                        sizes="48px"
                        className="object-contain"
                      />
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
                <TableCell className="hidden md:table-cell text-xs font-mono">
                  {item.whatsapp_number || "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs">{item.sort_order}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {item.view_count}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    item.max_clicks != null && item.click_count >= item.max_clicks
                      ? "text-red-500"
                      : "text-muted-foreground"
                  }`}>
                    <MousePointerClick className="h-3 w-3" />
                    {item.click_count}
                    {item.max_clicks != null && (
                      <span className="text-muted-foreground font-normal"> / {item.max_clicks}</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
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
                  {item.is_active ? (
                    <Badge className="bg-green-500/10 text-green-600">Ativo</Badge>
                  ) : item.max_clicks != null && item.click_count >= item.max_clicks ? (
                    <Badge className="bg-red-500/10 text-red-500">Limite atingido</Badge>
                  ) : (
                    <Badge className="bg-gray-500/10 text-gray-600">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Editar"
                      onClick={() => openEdit(item)}
                      className="text-xs"
                    >
                      <Pencil className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title={item.is_active ? "Desativar" : "Ativar"}
                      onClick={() => toggleActive(item.id, item.is_active)}
                      className="text-xs"
                    >
                      {item.is_active ? (
                        <EyeOff className="h-3 w-3 sm:mr-1" />
                      ) : (
                        <Eye className="h-3 w-3 sm:mr-1" />
                      )}
                      <span className="hidden sm:inline">{item.is_active ? "Desativar" : "Ativar"}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Remover"
                      onClick={() => deleteItem(item.id)}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Remover</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editingAd} onOpenChange={(open) => !open && setEditingAd(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar anúncio</DialogTitle>
          </DialogHeader>
          {editingAd && (
            <AdForm
              key={editingAd.id}
              ad={editingAd}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>

      <Dialog open={!!selectedAd} onOpenChange={(open) => !open && setSelectedAd(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAd?.title || "Anúncio"}</DialogTitle>
          </DialogHeader>
          {selectedAd && (() => {
            const conversion = getConversion(selectedAd)

            return (
              <div className="grid gap-4">
                <div className="grid gap-3 text-sm">
                  {selectedAd.image_url && (
                    <div className="relative aspect-video overflow-hidden rounded-md border bg-black">
                      <Image
                        src={selectedAd.image_url}
                        alt={selectedAd.image_alt || selectedAd.title}
                        fill
                        sizes="(max-width: 640px) calc(100vw - 3rem), 480px"
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className={`text-xs ${getStatusClass(selectedAd)}`}>
                      {getStatusLabel(selectedAd)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Ordem {selectedAd.sort_order}
                    </Badge>
                  </div>
                  {selectedAd.description && (
                    <div className="grid gap-1">
                      <span className="text-xs text-muted-foreground">Descrição</span>
                      <p className="whitespace-pre-line text-muted-foreground">{selectedAd.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md border p-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        Views
                      </span>
                      <p className="text-sm font-semibold">{selectedAd.view_count}</p>
                    </div>
                    <div className="rounded-md border p-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MousePointerClick className="h-3 w-3" />
                        Cliques
                      </span>
                      <p className={selectedAd.max_clicks != null && selectedAd.click_count >= selectedAd.max_clicks ? "text-sm font-semibold text-red-500" : "text-sm font-semibold"}>
                        {selectedAd.click_count}
                        {selectedAd.max_clicks != null && <span className="font-normal text-muted-foreground">/{selectedAd.max_clicks}</span>}
                      </p>
                    </div>
                    <div className="rounded-md border p-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Percent className="h-3 w-3" />
                        Conv.
                      </span>
                      <p className={`text-sm font-semibold ${getConversionClass(selectedAd)}`}>
                        {conversion == null ? "-" : `${conversion.toFixed(1)}%`}
                      </p>
                    </div>
                  </div>
                  {selectedAd.whatsapp_number && (
                    <div className="grid gap-1">
                      <span className="text-xs text-muted-foreground">WhatsApp</span>
                      <p className="font-mono text-xs">{selectedAd.whatsapp_number}</p>
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  {selectedAd.whatsapp_number && (
                    <Button variant="outline" className="justify-start" asChild>
                      <a href={`https://wa.me/${selectedAd.whatsapp_number}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" />
                        Abrir WhatsApp
                      </a>
                    </Button>
                  )}
                  {selectedAd.link_url && (
                    <Button variant="outline" className="justify-start" asChild>
                      <a href={selectedAd.link_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Abrir link
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" className="justify-start" onClick={() => openEdit(selectedAd)}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="outline" className="justify-start" onClick={() => toggleActive(selectedAd.id, selectedAd.is_active)}>
                    {selectedAd.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {selectedAd.is_active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variant="ghost" className="justify-start text-red-500 hover:text-red-600" onClick={() => deleteItem(selectedAd.id)}>
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
