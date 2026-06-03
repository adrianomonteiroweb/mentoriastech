"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useOpportunities } from "./opportunities-context"

export function QuickCreateModal() {
  const { state, dispatch, createOpportunity } = useOpportunities()
  const [companyName, setCompanyName] = useState("")
  const [companyLinkedin, setCompanyLinkedin] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [jobUrl, setJobUrl] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function reset() {
    setCompanyName("")
    setCompanyLinkedin("")
    setJobTitle("")
    setJobUrl("")
    setExpanded(false)
    setError("")
  }

  function handleClose() {
    dispatch({ type: "CLOSE_CREATE" })
    reset()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyName.trim() || !companyLinkedin.trim()) {
      setError("Preencha o nome e o LinkedIn da empresa.")
      return
    }

    setSaving(true)
    setError("")
    try {
      await createOpportunity({
        company_name: companyName.trim(),
        company_linkedin_url: companyLinkedin.trim(),
        title: jobTitle.trim() || undefined,
        url: jobUrl.trim() || undefined,
      })
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar oportunidade")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={state.isCreateOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova oportunidade</DialogTitle>
          <DialogDescription>
            Cole o link da empresa ou da vaga. Nos organizamos o resto com voce.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-name">Empresa *</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex.: Nubank, iFood, TOTVS..."
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-linkedin">LinkedIn da empresa *</Label>
            <Input
              id="company-linkedin"
              value={companyLinkedin}
              onChange={(e) => setCompanyLinkedin(e.target.value)}
              placeholder="https://linkedin.com/company/..."
            />
          </div>

          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-muted-foreground"
              >
                {expanded ? "▼" : "▶"} Mais detalhes (opcional)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 pt-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="job-title">Titulo da vaga</Label>
                <Input
                  id="job-title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Ex.: Desenvolvedor Junior"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="job-url">Link da vaga</Label>
                <Input
                  id="job-url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Adicionar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
