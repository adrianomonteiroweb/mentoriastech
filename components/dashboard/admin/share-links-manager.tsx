"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Check, Copy, Link, Loader2, Trash2 } from "lucide-react"
import type { SelectionProcessShareLink, ShareLinkPermission } from "@/lib/types/database"

interface ShareLinksManagerProps {
  processId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareLinksManager({ processId, open, onOpenChange }: ShareLinksManagerProps) {
  const [links, setLinks] = useState<SelectionProcessShareLink[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [permission, setPermission] = useState<ShareLinkPermission>("view")
  const [label, setLabel] = useState("")

  const loadLinks = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/selection-processes/${processId}/share-links`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setLinks(json.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [processId])

  useEffect(() => {
    if (open) loadLinks()
  }, [open, loadLinks])

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await fetch(`/api/admin/selection-processes/${processId}/share-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permission,
          label: label.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (json.data) {
        setLinks((prev) => [...prev, json.data])
        setLabel("")
        setPermission("view")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(linkId: string) {
    setDeletingId(linkId)
    try {
      await fetch(`/api/admin/selection-processes/${processId}/share-links/${linkId}`, {
        method: "DELETE",
      })
      setLinks((prev) => prev.filter((l) => l.id !== linkId))
    } catch (error) {
      console.error(error)
    } finally {
      setDeletingId(null)
    }
  }

  function buildUrl(token: string) {
    return `${window.location.origin}/s/processos-seletivos/${token}`
  }

  async function handleCopy(link: SelectionProcessShareLink) {
    await navigator.clipboard.writeText(buildUrl(link.token))
    setCopiedId(link.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Links de compartilhamento</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum link criado ainda
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="rounded-md border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant={link.permission === "edit" ? "default" : "secondary"} className="text-xs shrink-0">
                        {link.permission === "edit" ? "Edicao" : "Visualizacao"}
                      </Badge>
                      {link.label && (
                        <span className="text-xs text-muted-foreground truncate">{link.label}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleCopy(link)}
                      >
                        {copiedId === link.id ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => handleDelete(link.id)}
                        disabled={deletingId === link.id}
                      >
                        {deletingId === link.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground break-all font-mono leading-relaxed">
                    {buildUrl(link.token)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Novo link</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Permissao</Label>
                <Select value={permission} onValueChange={(v) => setPermission(v as ShareLinkPermission)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Somente visualizacao</SelectItem>
                    <SelectItem value="edit">Edicao (checklist e notas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Rotulo (opcional)</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Link para RH da empresa X"
                  className="h-9"
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link className="h-4 w-4 mr-2" />
                )}
                Criar link
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
