"use client"

import { useEffect, useRef, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ClipboardList,
  Download,
  ExternalLink,
  Loader2,
  MessageCircle,
  Pencil,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { formatWhatsAppNumber } from "@/lib/whatsapp"
import { MenteeHistoryDialog } from "@/components/dashboard/admin/mentee-history-dialog"
import type { CareerStatus, Profile, Seniority } from "@/lib/types/database"

const CAREER_STATUS_LABEL: Record<CareerStatus, string> = {
  seeking: "Buscando vaga",
  interning: "Estagiando",
  employed: "Empregado",
  student: "Estudante",
  other: "Outro",
}

const SENIORITY_LABEL: Record<Seniority, string> = {
  junior: "Júnior",
  mid: "Pleno",
  senior: "Sênior",
  undefined: "Indefinido",
}

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
  const [historyMentee, setHistoryMentee] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [currentResumeUrl, setCurrentResumeUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    whatsapp: "",
    linkedin_url: "",
    bio: "",
    portfolio_url: "",
    career_status: "" as CareerStatus | "",
    seniority: "" as Seniority | "",
    career_focus: "",
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
    setResumeFile(null)
    setCurrentResumeUrl(mentee.resume_url || null)
    setForm({
      full_name: mentee.full_name || "",
      email: mentee.email || "",
      whatsapp: mentee.whatsapp || "",
      linkedin_url: mentee.linkedin_url || "",
      bio: mentee.bio || "",
      portfolio_url: mentee.portfolio_url || "",
      career_status: mentee.career_status || "",
      seniority: mentee.seniority || "",
      career_focus: mentee.career_focus || "",
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

  async function handleResumeUpload() {
    if (!resumeFile || !editingMentee) return

    setUploadingResume(true)
    setError("")

    try {
      const data = new FormData()
      data.append("file", resumeFile)

      const res = await fetch(`/api/admin/mentees/${editingMentee.id}/resume`, {
        method: "POST",
        body: data,
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Erro ao enviar currículo")
      }

      const { url } = await res.json()
      setCurrentResumeUrl(url)
      setResumeFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setEditingMentee((prev) => (prev ? { ...prev, resume_url: url } : null))
      // Atualiza a linha na tabela sem fechar o dialog
      setMentees((prev) =>
        prev.map((m) => (m.id === editingMentee.id ? { ...m, resume_url: url } : m)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar currículo")
    } finally {
      setUploadingResume(false)
    }
  }

  async function deleteMentee(id: string) {
    if (!confirm("Excluir este mentorado? Esta acao tambem remove dados vinculados ao perfil.")) return

    await fetch(`/api/admin/mentees/${id}`, { method: "DELETE" })
    loadMentees()
  }

  const columnCount = canManage ? 7 : 6

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
              <TableHead className="hidden lg:table-cell">Perfil</TableHead>
              <TableHead className="hidden md:table-cell">LinkedIn</TableHead>
              <TableHead className="hidden sm:table-cell">Portfólio</TableHead>
              {canManage && <TableHead>Ações</TableHead>}
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
                  <TableCell className="hidden lg:table-cell">
                    {m.career_status || m.seniority || m.career_focus ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap gap-1">
                          {m.career_status && (
                            <Badge variant="outline" className="text-[10px]">
                              {CAREER_STATUS_LABEL[m.career_status]}
                            </Badge>
                          )}
                          {m.seniority && (
                            <Badge variant="outline" className="text-[10px]">
                              {SENIORITY_LABEL[m.seniority]}
                            </Badge>
                          )}
                        </div>
                        {m.career_focus && (
                          <span className="text-[11px] text-muted-foreground">
                            {m.career_focus}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
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
                    <div className="flex flex-col gap-1">
                      {m.portfolio_url ? (
                        <a
                          href={m.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Portfólio
                        </a>
                      ) : null}
                      {m.resume_url ? (
                        <a
                          href={m.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
                        >
                          <Download className="h-3 w-3" />
                          Currículo
                        </a>
                      ) : null}
                      {!m.portfolio_url && !m.resume_url && (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setHistoryMentee(m)}
                        >
                          <ClipboardList className="h-3 w-3 mr-1" />
                          Histórico
                          {(m.booking_count ?? 0) > 0 && (
                            <Badge
                              variant="secondary"
                              className="ml-1 h-4 min-w-[16px] px-1 text-[10px]"
                            >
                              {m.booking_count}
                            </Badge>
                          )}
                        </Button>
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
              <Label htmlFor="mentee-portfolio">URL do Portfólio</Label>
              <Input
                id="mentee-portfolio"
                type="url"
                value={form.portfolio_url}
                onChange={(e) => setForm((current) => ({ ...current, portfolio_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="flex flex-col gap-2 rounded-md border p-3">
              <Label>Currículo (PDF)</Label>
              {currentResumeUrl ? (
                <a
                  href={currentResumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  Ver / baixar currículo atual
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum currículo enviado</p>
              )}
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!resumeFile || uploadingResume}
                  onClick={handleResumeUpload}
                  className="shrink-0"
                >
                  {uploadingResume ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1">{uploadingResume ? "Enviando…" : "Enviar"}</span>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Status profissional</Label>
                <Select
                  value={form.career_status || "none"}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      career_status: value === "none" ? "" : (value as CareerStatus),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {(Object.keys(CAREER_STATUS_LABEL) as CareerStatus[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {CAREER_STATUS_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Senioridade</Label>
                <Select
                  value={form.seniority || "none"}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      seniority: value === "none" ? "" : (value as Seniority),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {(Object.keys(SENIORITY_LABEL) as Seniority[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {SENIORITY_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mentee-focus">Foco de carreira</Label>
              <Input
                id="mentee-focus"
                value={form.career_focus}
                onChange={(e) =>
                  setForm((current) => ({ ...current, career_focus: e.target.value }))
                }
                placeholder="Ex.: Backend Java, Dados, RPA..."
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

      <MenteeHistoryDialog
        mentee={historyMentee}
        open={!!historyMentee}
        onClose={() => setHistoryMentee(null)}
      />
    </div>
  )
}
