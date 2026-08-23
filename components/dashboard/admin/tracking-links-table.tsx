"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Eye, Trash2, Users } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface TrackingLink {
  id: string
  name: string
  utmSource: string
  utmMedium: string
  utmCampaign: string | null
  destinationPath: string
  isActive: boolean
  totalViews: number
  uniqueVisitors: number
  createdAt: string
}

interface TrackingLinksTableProps {
  refreshKey: number
  onRefresh: () => void
}

export function TrackingLinksTable({ refreshKey, onRefresh }: TrackingLinksTableProps) {
  const [links, setLinks] = useState<TrackingLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch("/api/admin/tracking-links")
      .then((res) => res.json())
      .then((json) => setLinks(json.data || []))
      .finally(() => setLoading(false))
  }, [refreshKey])

  function buildUrl(link: TrackingLink) {
    const base = typeof window !== "undefined" ? window.location.origin : ""
    const params = new URLSearchParams()
    params.set("utm_source", link.utmSource)
    params.set("utm_medium", link.utmMedium)
    if (link.utmCampaign) params.set("utm_campaign", link.utmCampaign)
    return `${base}${link.destinationPath}?${params.toString()}`
  }

  async function handleCopy(link: TrackingLink) {
    await navigator.clipboard.writeText(buildUrl(link))
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este link de rastreamento?")) return
    await fetch(`/api/admin/tracking-links/${id}`, { method: "DELETE" })
    onRefresh()
  }

  async function handleToggle(link: TrackingLink) {
    await fetch(`/api/admin/tracking-links/${link.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !link.isActive }),
    })
    onRefresh()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum link criado ainda. Crie seu primeiro link de rastreamento.
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Fonte</TableHead>
            <TableHead>Meio</TableHead>
            <TableHead>Campanha</TableHead>
            <TableHead>Destino</TableHead>
            <TableHead className="text-center">
              <Eye className="h-4 w-4 inline mr-1" />
              Views
            </TableHead>
            <TableHead className="text-center">
              <Users className="h-4 w-4 inline mr-1" />
              Unicos
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((link) => (
            <TableRow key={link.id}>
              <TableCell className="font-medium max-w-[200px] truncate">
                {link.name}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{link.utmSource}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{link.utmMedium}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {link.utmCampaign || "—"}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {link.destinationPath}
              </TableCell>
              <TableCell className="text-center font-semibold">
                {link.totalViews}
              </TableCell>
              <TableCell className="text-center font-semibold">
                {link.uniqueVisitors}
              </TableCell>
              <TableCell>
                <Badge
                  variant={link.isActive ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => handleToggle(link)}
                >
                  {link.isActive ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => handleCopy(link)} title="Copiar link">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(link.id)} title="Remover">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
