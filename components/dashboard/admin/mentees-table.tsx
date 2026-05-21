"use client"

import { useEffect, useState } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, MessageCircle, Pencil, Search, Trash2 } from "lucide-react"
import { formatWhatsAppNumber } from "@/lib/whatsapp"
import type { Profile } from "@/lib/types/database"

function WhatsAppLink({ mentee }: { mentee: Profile }) {
  if (!mentee.whatsapp) {
    return <span className="text-xs text-muted-foreground">-</span>
  }

  const whatsappNumber = formatWhatsAppNumber(mentee.whatsapp)

  return (
    <a
      href={`https://wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir conversa com ${mentee.full_name || mentee.email || "mentorado"} no WhatsApp`}
      className="inline-flex max-w-[160px] items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500 transition-colors hover:bg-emerald-500/20"
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{mentee.whatsapp}</span>
    </a>
  )
}

interface MenteesTableProps {
  canManage?: boolean
}

export function MenteesTable({ canManage = false }: MenteesTableProps) {
  const [mentees, setMentees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editingMentee, setEditingMentee] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    whatsapp: "",
    linkedin_url: "",
    bio: "",
    resume_url: "",
  })

  function loadMentees() {
    setLoading(true)
    const params = search ? `?search=${encodeURIComponent(search)}` : ""
    fetch(`/api/admin/mentees${params}`)
      .then((r) => r.json())
      .then((json) => setMentees(json.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timeout = setTimeout(loadMentees, 300)
    return () => clearTimeout(timeout)
  }, [search])

  function openEdit(mentee: Profile) {
    setEditingMentee(mentee)
    setError("")
    setForm({
      full_name: mentee.full_name || "",
      email: mentee.email || "",
      whatsapp: mentee.whatsapp || "",
      linkedin_url: mentee.linkedin_url || "",
      bio: mentee.bio || "",
      resume_url: mentee.resume_url || "",
    })
  }

  async function saveMentee(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMentee) return

    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/mentees/${editingMentee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao salvar mentorado")
      }

      setEditingMentee(null)
      loadMentees()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function deleteMentee(id: string) {
    if (!confirm("Excluir este mentorado? Esta acao tambem remove dados vinculados ao perfil.")) return

    await fetch(`/api/admin/mentees/${id}`, { method: "DELETE" })
    loadMentees()
  }

  const columnCount = canManage ? 6 : 5

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead className="hidden md:table-cell">LinkedIn</TableHead>
              <TableHead className="hidden sm:table-cell">Curriculo</TableHead>
              {canManage && <TableHead>Acoes</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columnCount }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : mentees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground py-8">
                  Nenhum mentorado encontrado
                </TableCell>
              </TableRow>
            ) : (
              mentees.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <div className="flex min-w-[120px] flex-col">
                      <span>{m.full_name || "-"}</span>
                      <span className="text-xs font-normal text-muted-foreground sm:hidden">
                        {m.email || "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs">{m.email || "-"}</TableCell>
                  <TableCell>
                    <WhatsAppLink mentee={m} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {m.linkedin_url ? (
                      <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline">
                        LinkedIn
                      </a>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {m.resume_url ? (
                      <a href={m.resume_url} target="_blank" rel="noopener noreferrer">
                        <Badge variant="outline" className="text-xs">PDF</Badge>
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(m)}>
                          <Pencil className="h-3 w-3 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteMentee(m.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Excluir
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingMentee} onOpenChange={(open) => !open && setEditingMentee(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar mentorado</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveMentee} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mentee-name">Nome</Label>
                <Input
                  id="mentee-name"
                  value={form.full_name}
                  onChange={(e) => setForm((current) => ({ ...current, full_name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mentee-email">Email</Label>
                <Input
                  id="mentee-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mentee-whatsapp">WhatsApp</Label>
                <Input
                  id="mentee-whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => setForm((current) => ({ ...current, whatsapp: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mentee-linkedin">LinkedIn</Label>
                <Input
                  id="mentee-linkedin"
                  type="url"
                  value={form.linkedin_url}
                  onChange={(e) => setForm((current) => ({ ...current, linkedin_url: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mentee-resume">Curriculo</Label>
              <Input
                id="mentee-resume"
                type="url"
                value={form.resume_url}
                onChange={(e) => setForm((current) => ({ ...current, resume_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mentee-bio">Bio</Label>
              <Textarea
                id="mentee-bio"
                value={form.bio}
                onChange={(e) => setForm((current) => ({ ...current, bio: e.target.value }))}
                rows={4}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Salvar mentorado
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
