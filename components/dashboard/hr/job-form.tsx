"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, Send, CheckCircle2 } from "lucide-react"
import type { Job } from "@/lib/types/database"

interface JobFormProps {
  onSuccess?: () => void
  job?: Job
  adminMode?: boolean
}

export function JobForm({ onSuccess, job, adminMode = false }: JobFormProps) {
  const isEditing = Boolean(job)
  const [title, setTitle] = useState(job?.title || "")
  const [company, setCompany] = useState(job?.company || "")
  const [description, setDescription] = useState(job?.description || "")
  const [location, setLocation] = useState(job?.location || "")
  const [jobType, setJobType] = useState(job?.job_type || "remote")
  const [level, setLevel] = useState(job?.level || "junior")
  const [salaryRange, setSalaryRange] = useState(job?.salary_range || "")
  const [applicationUrl, setApplicationUrl] = useState(job?.application_url || "")
  const [isInternational, setIsInternational] = useState(job?.is_international || false)
  const [requiredLanguage, setRequiredLanguage] = useState(job?.required_language || "")
  const [languageLevel, setLanguageLevel] = useState(job?.language_level || "")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const endpoint = isEditing
        ? adminMode
          ? `/api/admin/jobs/${job!.id}`
          : `/api/jobs/${job!.id}`
        : "/api/jobs"

      const res = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company,
          description,
          location: location || undefined,
          job_type: jobType,
          level,
          salary_range: salaryRange || undefined,
          application_url: applicationUrl || undefined,
          is_international: isInternational,
          required_language: isInternational && requiredLanguage ? requiredLanguage : undefined,
          language_level: isInternational && languageLevel ? languageLevel : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao salvar vaga")
      }

      setSuccess(true)
      if (!isEditing) {
        setTitle("")
        setCompany("")
        setDescription("")
        setLocation("")
        setSalaryRange("")
        setApplicationUrl("")
      }
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <p className="text-sm font-medium">
          {isEditing ? "Vaga atualizada com sucesso!" : "Vaga publicada com sucesso!"}
        </p>
        {!isEditing && (
          <Button variant="outline" onClick={() => setSuccess(false)}>
            Publicar outra vaga
          </Button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Titulo da vaga</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Dev Full-Stack" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="company">Empresa</Label>
          <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="desc">Descricao</Label>
        <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} placeholder="Requisitos, responsabilidades, beneficios..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location">Localizacao</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Fortaleza, CE" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Modelo</Label>
          <Select value={jobType} onValueChange={(value) => setJobType(value as typeof jobType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="remote">Remoto</SelectItem>
              <SelectItem value="hybrid">Hibrido</SelectItem>
              <SelectItem value="onsite">Presencial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Nivel</Label>
        <Select value={level} onValueChange={(value) => setLevel(value as typeof level)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="internship">Estagio & Trainee</SelectItem>
            <SelectItem value="junior">Junior</SelectItem>
            <SelectItem value="mid">Pleno</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="salary">Faixa salarial</Label>
        <Input id="salary" value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} placeholder="R$ 5.000 - R$ 8.000" />
      </div>

      <div className="flex items-center gap-3">
        <Switch id="international" checked={isInternational} onCheckedChange={setIsInternational} />
        <Label htmlFor="international">Vaga internacional</Label>
      </div>

      {isInternational && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lang">Idioma exigido</Label>
            <Input id="lang" value={requiredLanguage} onChange={(e) => setRequiredLanguage(e.target.value)} placeholder="Inglês" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nivel do idioma</Label>
            <Select value={languageLevel} onValueChange={setLanguageLevel}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basico</SelectItem>
                <SelectItem value="intermediate">Intermediario</SelectItem>
                <SelectItem value="advanced">Avancado</SelectItem>
                <SelectItem value="fluent">Fluente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="appUrl">Link para candidatura (LinkedIn ou site)</Label>
        <Input id="appUrl" value={applicationUrl} onChange={(e) => setApplicationUrl(e.target.value)} placeholder="https://linkedin.com/jobs/..." />
        <p className="text-xs text-muted-foreground">Link direto para o LinkedIn ou site da empresa</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
        {loading ? "Salvando..." : isEditing ? "Salvar alteracoes" : "Publicar vaga"}
      </Button>
    </form>
  )
}
