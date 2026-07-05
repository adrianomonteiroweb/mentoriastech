"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Building2, ClipboardList, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import type { SimCompanyApi, SimCompanyArchetype } from "@/lib/types/database"

const ARCHETYPE_OPTIONS: {
  value: SimCompanyArchetype
  label: string
  hint: string
}[] = [
  { value: "startup", label: "Startup", hint: "Estrutura flexível, alta velocidade, pouca burocracia" },
  { value: "saas", label: "SaaS", hint: "Arquitetura modular, boas práticas de organização" },
  { value: "enterprise", label: "Enterprise", hint: "Clean Architecture, regras rígidas, forte padronização" },
]

const DOC_SECTIONS = [
  { key: "description", title: "Sobre a empresa", placeholder: "História, missão e contexto da empresa fictícia…" },
  { key: "product_description", title: "Produto", placeholder: "Qual produto está sendo desenvolvido…" },
  { key: "client_description", title: "Cliente", placeholder: "Quem é o cliente fictício e o que ele precisa…" },
  { key: "service_description", title: "Serviço", placeholder: "Serviço prestado pela empresa…" },
  { key: "process_description", title: "Processo de trabalho", placeholder: "Rituais: sprint, daily assíncrona, code review…" },
  { key: "po_doc_markdown", title: "Documento do PO", placeholder: "# Visão do Produto\n\nRequisitos e prioridades do Product Owner…" },
  { key: "pm_doc_markdown", title: "Documento do PM", placeholder: "# Planejamento\n\nCronograma, entregas e expectativas do PM…" },
  { key: "tech_lead_doc_markdown", title: "Documento do Tech Lead", placeholder: "# Padrões de Arquitetura\n\nEstrutura de pastas, convenções e boas práticas…" },
] as const

type DocKey = (typeof DOC_SECTIONS)[number]["key"]

interface FormState {
  name: string
  archetype: SimCompanyArchetype
  is_active: boolean
  docs: Record<DocKey, string>
}

function emptyForm(): FormState {
  return {
    name: "",
    archetype: "startup",
    is_active: true,
    docs: {
      description: "",
      product_description: "",
      client_description: "",
      service_description: "",
      process_description: "",
      po_doc_markdown: "",
      pm_doc_markdown: "",
      tech_lead_doc_markdown: "",
    },
  }
}

function formFromCompany(company: SimCompanyApi): FormState {
  return {
    name: company.name,
    archetype: company.archetype,
    is_active: company.is_active,
    docs: {
      description: company.description ?? "",
      product_description: company.product_description ?? "",
      client_description: company.client_description ?? "",
      service_description: company.service_description ?? "",
      process_description: company.process_description ?? "",
      po_doc_markdown: company.po_doc_markdown ?? "",
      pm_doc_markdown: company.pm_doc_markdown ?? "",
      tech_lead_doc_markdown: company.tech_lead_doc_markdown ?? "",
    },
  }
}

/**
 * Hub "Empresa Fictícia": cadastro completo em uma única tela — perfil,
 * produto, cliente, serviço, processo e docs de PO/PM/Tech Lead.
 */
export function CompanyHub() {
  const [companies, setCompanies] = useState<SimCompanyApi[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<SimCompanyApi | "new" | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<SimCompanyApi | null>(null)
  const [templateCounts, setTemplateCounts] = useState<Map<string, number>>(new Map())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [companiesRes, templatesRes] = await Promise.all([
        fetch("/api/admin/sprints/companies"),
        fetch("/api/admin/sprints/templates"),
      ])
      const companiesJson = await companiesRes.json()
      const templatesJson = await templatesRes.json()
      if (companiesRes.ok) setCompanies(companiesJson.data || [])
      if (templatesRes.ok) {
        const counts = new Map<string, number>()
        for (const t of (templatesJson.data || []) as { company_id?: string }[]) {
          if (t.company_id) counts.set(t.company_id, (counts.get(t.company_id) ?? 0) + 1)
        }
        setTemplateCounts(counts)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function startEdit(company: SimCompanyApi | "new") {
    setEditing(company)
    setForm(company === "new" ? emptyForm() : formFromCompany(company))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        archetype: form.archetype,
        is_active: form.is_active,
        ...form.docs,
      }
      const isNew = editing === "new"
      const res = await fetch(
        isNew
          ? "/api/admin/sprints/companies"
          : `/api/admin/sprints/companies/${(editing as SimCompanyApi).id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || "Erro ao salvar empresa")
        return
      }
      toast.success(isNew ? "Empresa criada" : "Empresa atualizada")
      setEditing(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    const res = await fetch(`/api/admin/sprints/companies/${deleting.id}`, {
      method: "DELETE",
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      toast.error(json?.error || "Erro ao excluir empresa")
    } else {
      toast.success("Empresa excluída")
      load()
    }
    setDeleting(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Carregando empresas">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-3xl">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            {editing === "new" ? "Nova Empresa Fictícia" : `Editar ${form.name}`}
          </h2>
          <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
            Voltar
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-name" className="text-sm font-medium">
                Nome da empresa
              </label>
              <Input
                id="company-name"
                required
                minLength={2}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: NimbusPay"
              />
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium mb-1">Arquétipo</legend>
              <RadioGroup
                value={form.archetype}
                onValueChange={(value) =>
                  setForm({ ...form, archetype: value as SimCompanyArchetype })
                }
                className="flex flex-col gap-2"
              >
                {ARCHETYPE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition-colors has-[[data-state=checked]]:border-primary"
                  >
                    <RadioGroupItem value={option.value} className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium text-foreground">
                        {option.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {option.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </fieldset>

            <div className="flex items-center gap-3">
              <Switch
                id="company-active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm({ ...form, is_active: checked })
                }
              />
              <Label htmlFor="company-active" className="text-sm">
                Empresa ativa (vagas visíveis para mentorados)
              </Label>
            </div>
          </CardContent>
        </Card>

        <Accordion
          type="multiple"
          defaultValue={["description"]}
          className="rounded-xl border border-border bg-card px-4"
        >
          {DOC_SECTIONS.map((section) => (
            <AccordionItem key={section.key} value={section.key}>
              <AccordionTrigger className="text-sm font-semibold min-h-[48px]">
                <span className="flex items-center gap-2">
                  {section.title}
                  {form.docs[section.key] && (
                    <Badge variant="outline" className="text-[10px]">
                      Preenchido
                    </Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <Textarea
                  rows={8}
                  maxLength={20_000}
                  value={form.docs[section.key]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      docs: { ...form.docs, [section.key]: e.target.value },
                    })
                  }
                  placeholder={section.placeholder}
                  aria-label={section.title}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Button type="submit" disabled={saving} className="min-h-[44px]">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {editing === "new" ? "Criar empresa" : "Salvar alterações"}
        </Button>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/sprints"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[40px] self-start"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Sprints
      </Link>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Cada empresa é um contexto completo de sprint: produto, cliente,
          processo e documentação da equipe.
        </p>
        <Button onClick={() => startEdit("new")} className="min-h-[40px] shrink-0">
          <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
          Nova empresa
        </Button>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="mt-2 text-base text-muted-foreground">
            Nenhuma empresa fictícia ainda. Crie a primeira para publicar vagas.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {companies.map((company) => (
            <Card key={company.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4 px-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-foreground">
                      {company.name}
                    </p>
                    <Badge variant="outline">
                      {ARCHETYPE_OPTIONS.find((o) => o.value === company.archetype)?.label}
                    </Badge>
                    {!company.is_active && (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                    {(templateCounts.get(company.id) ?? 0) > 0 && (
                      <Link
                        href="/admin/sprints/templates"
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        <ClipboardList className="h-3 w-3" aria-hidden="true" />
                        {templateCounts.get(company.id)} {templateCounts.get(company.id) === 1 ? "vaga" : "vagas"}
                      </Link>
                    )}
                  </div>
                  {company.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                      {company.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[40px]"
                    onClick={() => startEdit(company)}
                    aria-label={`Editar ${company.name}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[40px] text-destructive hover:text-destructive"
                    onClick={() => setDeleting(company)}
                    aria-label={`Excluir ${company.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Os templates de vaga desta empresa também serão excluídos.
              Empresas com sprints vinculadas não podem ser excluídas — apenas
              desativadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
